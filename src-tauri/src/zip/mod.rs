use crate::prelude::*;

use std::ffi::OsStr;
use std::fs::File;
use std::io::{BufReader, BufWriter};
use zifu_core::filename_decoder;
use zifu_core::InputZIPArchive;

/// Fix the encoding of file names in a Zip archive and write the fixed archive to the output path.
pub fn fix_zip_fname_encoding(file_path: String, output_zip_path: String) -> Result<String> {
    let bufr = BufReader::new(File::open(file_path)?);

    let mut input_zip_file = InputZIPArchive::new(bufr)?;
    input_zip_file.check_unsupported_zip_type()?;

    let legacy_decoder = <dyn filename_decoder::IDecoder>::native_oem_encoding();
    let sjis_decoder = <dyn filename_decoder::IDecoder>::from_encoding_name("sjis").unwrap();
    let utf8_decoder = <dyn filename_decoder::IDecoder>::utf8();
    let ascii_decoder = <dyn filename_decoder::IDecoder>::ascii();

    let decoders_list = vec![
        &*ascii_decoder,
        &*sjis_decoder,
        &*legacy_decoder,
        &*utf8_decoder,
    ];

    // Detect encoding by trying decoding all of file names and comments
    let best_fit_decoder_index_ = input_zip_file.get_filename_decoder_index(&decoders_list);
    match best_fit_decoder_index_ {
        Some(index) => {
            debug!(
                "Detected encoding: {:?}",
                decoders_list[index].encoding_name()
            );
            let guessed_encoder = decoders_list[index];
            input_zip_file.convert_central_directory_file_names(guessed_encoder);
            let mut output_zip_file = BufWriter::new(File::create(&output_zip_path)?);
            input_zip_file
                .output_archive_with_central_directory_file_names(&mut output_zip_file)?;
            Ok(output_zip_path)
        }
        None => Err(anyhow::anyhow!("Failed to detect encoding.")),
    }
}

pub fn unzip(file_path: &Path, target_dir: &Path) -> Result<PathBuf> {
    use zip_extract::extract;
    let archive = std::fs::read(file_path)?;
    extract(std::io::Cursor::new(archive), target_dir, true)?;
    Ok(target_dir.to_path_buf())
}

fn to_stem(file_path: impl AsRef<Path>) -> String {
    let file_name = file_path
        .as_ref()
        .file_name()
        .and_then(OsStr::to_str)
        .unwrap_or("");
    let mut parts: Vec<&str> = file_name.split('.').collect();
    if parts.len() > 1 {
        parts.pop();
    }
    parts.join(".")
}

pub mod commands {
    use super::*;
    use crate::files::{copy_dir_all, get_shallowest_mod_dir, remove_dir_all};
    use tempfile::tempdir;

    struct SrcDestPaths {
        src: std::path::PathBuf,
        dest: std::path::PathBuf,
        tmp_extract: tempfile::TempDir,
        tmp_zip: tempfile::TempDir,
    }

    fn prepare_paths(src: String, exists_ok: Option<bool>) -> Result<SrcDestPaths> {
        let src_path = std::path::PathBuf::from(src);
        let src_stem = to_stem(&src_path);
        debug!("--- src_stem: {}", src_stem);

        let dest_dir = crate::paths::moddata_dir();
        let dest_path = dest_dir.join(src_stem);
        debug!("--- dest_path: {}", dest_path.display());

        // check if src_path exists, otherwise return error
        ensure!(
            src_path.exists(),
            "Source file does not exist: {}",
            src_path.display()
        );

        // check if dest_path doesnt exist, or, if exists_ok is set to true and dest_path exists.
        // otherwise return error
        ensure!(
            !dest_path.exists() || (exists_ok.is_some_and(|x| x) && dest_path.exists()),
            "Destination directory already exists: {}",
            dest_path.display()
        );

        let tmp_zip = tempdir().unwrap();
        let tmp_extract = tempdir().unwrap();
        Ok(SrcDestPaths {
            src: src_path,
            dest: dest_path,
            tmp_extract,
            tmp_zip,
        })
    }

    // Zipファイル名の文字コードを修正
    // target_dir/{srcのファイル名}に修正版のzipファイルを作成する
    fn create_fixed_encoding_zip(
        src_zip_path: &std::path::Path,
        target_dir: &std::path::Path,
    ) -> Result<std::path::PathBuf, String> {
        let filename = src_zip_path.file_name().unwrap();
        let fixed_zip_path = fix_zip_fname_encoding(
            src_zip_path.display().to_string(),
            target_dir.join(filename).display().to_string(),
        )
        .map_err(|e| format!("Failed to fix encoding of ZIP archive: {}", e))?;
        debug!("Fixed zip file created: {}", &fixed_zip_path);
        Ok(PathBuf::from(fixed_zip_path))
    }

    /// Unzips a mod archive to a destination directory.
    /// src: Mod archive file path
    /// dest_dir: profile's mod directory
    #[tauri::command]
    pub fn unzip_mod_archive(src: String, exists_ok: Option<bool>) -> Result<(), String> {
        let paths = prepare_paths(src, exists_ok).map_err(|e| e.to_string())?;
        let fixed_zip_path = create_fixed_encoding_zip(&paths.src, paths.tmp_zip.path())
            .map_err(|e| e.to_string())?;
        let tmp_dir_path = paths.tmp_extract.path().to_path_buf();
        unzip(&fixed_zip_path, &tmp_dir_path).map_err(|e| e.to_string())?;

        let mod_dir = get_shallowest_mod_dir(&tmp_dir_path)
            .ok_or_else(|| "No mod directory found in archive".to_string())?;

        // exists_okがtrueで、destディレクトリが存在する場合、.git/*以外のdestディレクトリの内容を削除する
        if exists_ok.is_some_and(|x| x) && paths.dest.clone().exists() {
            debug!("Removing existing directory: {}", &paths.dest.display());
            remove_dir_all(&paths.dest, Some(".git")).unwrap();
        };

        info!("Copying mod to: {}", &paths.dest.display());
        copy_dir_all(mod_dir, &paths.dest, Some(".git"))
            .map(|_| debug!("Mod extracted to: {}", &paths.dest.display()))
            .map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn unzip_archive(src: String, dest_dir: String) -> Result<(), String> {
        let src_path = std::path::PathBuf::from(src);
        let dest_dir_path = std::path::PathBuf::from(dest_dir);
        unzip(&src_path, &dest_dir_path)
            .map_err(|e| e.to_string())
            .map(|_| ())
    }
}
