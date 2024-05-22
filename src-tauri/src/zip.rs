pub mod commands {
    use crate::logic;
    use logic::utils::{copy_dir_all, get_shallowest_mod_dir, remove_dir_all};
    use logic::zip::fix_zip_fname_encoding;
    use tempfile::tempdir;

    #[tauri::command]
    pub fn unzip_mod_archive(
        src: String,
        dest: String,
        exists_ok: Option<bool>,
    ) -> Result<(), String> {
        let src_path = std::path::PathBuf::from(src);
        let dest_path = std::path::PathBuf::from(dest).with_extension("");

        if !src_path.exists() {
            return Err(format!(
                "Source file does not exist: {}",
                src_path.display()
            ));
        }

        if exists_ok.is_some_and(|x| x) {
            if dest_path.exists() {
                println!(
                    "Destination already exists, so we merge them: {}",
                    dest_path.display()
                );
            }
        } else if dest_path.exists() {
            return Err(format!(
                "Destination directory already exists: {}",
                dest_path.display()
            ));
        }
        let tmp_dir_zip = tempdir().unwrap();
        let tmp_dir_zip_path = tmp_dir_zip.path();
        println!("tmp zip dir {}", tmp_dir_zip_path.display());

        // src_pathのファイル名の文字コードを修正
        // temp_dir/{srcのファイル名}に修正版のzipファイルを作成
        let filename = src_path.file_name().unwrap().to_str().unwrap();
        let fixed_src_path = fix_zip_fname_encoding(
            src_path.display().to_string(),
            tmp_dir_zip_path.join(filename).display().to_string(),
        )
        .map_err(|e| format!("Failed to fix encoding of ZIP archive: {}", e))?;
        println!("Fixed zip file created: {}", fixed_src_path);

        let archive: Vec<u8> = std::fs::read(fixed_src_path).unwrap();
        let archive = std::io::Cursor::new(archive);

        let tmp_dir = tempdir().unwrap();
        let tmp_dir_path = tmp_dir.path();
        println!("tmp extract mod to {}", tmp_dir_zip_path.display());

        match zip_extract::extract(archive, tmp_dir_path, true) {
            Ok(_) => {
                // find if there is a mod directory in the extracted files
                let mod_dir = get_shallowest_mod_dir(tmp_dir_path);

                // if None, remove tmp_dir and return error
                match mod_dir {
                    Some(mod_dir) => {
                        // if dest_path exists, overwrite (merge) the mod directory.
                        if exists_ok.is_some_and(|x| x) && dest_path.exists() {
                            println!("Removing existing directory: {}", dest_path.display());
                            remove_dir_all(&dest_path, Some(".git")).unwrap();
                            println!("Merging mod directory to {}", dest_path.display());
                            copy_dir_all(&mod_dir, &dest_path, Some(".git")).unwrap();
                        } else {
                            // copy the mod directory to the destination
                            std::fs::rename(mod_dir, dest_path).unwrap();
                        }
                    }
                    None => {
                        // remove tmp dir and return error
                        tmp_dir.close().unwrap();
                        return Err("Failed to extract archive: Invalid mod directory".to_string());
                    }
                }
                Ok(())
            }
            Err(e) => {
                tmp_dir.close().unwrap();
                Err(format!("Failed to extract archive: {}", e))
            }
        }
    }
}
