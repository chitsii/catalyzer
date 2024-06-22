use crate::prelude::*;
use dmg::Handle;
use dmgwiz::{DmgWiz, Verbosity};
use std::{fs::File, io::BufWriter};

fn extract_all(source_dmg: PathBuf, target_dir: PathBuf) -> Result<()> {
    info!(
        "Extracting DMG: {} to {}",
        source_dmg.display(),
        target_dir.display()
    );
    ensure!(
        source_dmg.exists()
            && source_dmg.is_file()
            && source_dmg.extension().unwrap().eq_ignore_ascii_case("dmg"),
        "Source file is not a DMG file or does not exist"
    );
    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir)?;
    }

    let input = File::open(source_dmg)?;
    let mut wiz = match DmgWiz::from_reader(input, Verbosity::Info) {
        Err(e) => {
            warn!("Failed to open DMG: {}", e);
            return Err(anyhow!("Failed to open DMG: {}", e));
        }
        Ok(wiz) => wiz,
    };

    let outfile = File::create(target_dir.join("output")).unwrap();
    let output = BufWriter::new(outfile);
    match wiz.extract_all(output) {
        Ok(bytes) => {
            info!("Extracted {} bytes", bytes);
            Ok(())
        }
        Err(e) => {
            warn!("Failed to extract DMG: {}", e);
            Err(anyhow!("Failed to extract DMG: {}", e))
        }
    }
}

fn extract_data(source_dmg: PathBuf, target_dir: PathBuf) -> Result<()> {
    info!(
        "Extracting DMG: {} to {}",
        source_dmg.display(),
        target_dir.display()
    );
    ensure!(
        source_dmg.exists()
            && source_dmg.is_file()
            && source_dmg.extension().unwrap().eq_ignore_ascii_case("dmg"),
        "Source file is not a DMG file or does not exist"
    );
    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir)?;
    }

    let input = File::open(source_dmg)?;
    let mut wiz = match DmgWiz::from_reader(input, Verbosity::Info) {
        Err(e) => {
            warn!("Failed to open DMG: {}", e);
            return Err(anyhow!("Failed to open DMG: {}", e));
        }
        Ok(wiz) => wiz,
    };

    let outfile = File::create(target_dir.join("output")).unwrap();
    let output = BufWriter::new(outfile);
    match wiz.extract_partition(output, 4) {
        Ok(bytes) => {
            info!("Extracted {} bytes", bytes);
            Ok(())
        }
        Err(e) => {
            warn!("Failed to extract DMG: {}", e);
            Err(anyhow!("Failed to extract DMG: {}", e))
        }
    }
}

fn mount(source_dmg: PathBuf) -> Result<Handle> {
    info!("Mounting DMG: {}", source_dmg.display());
    ensure!(
        source_dmg.exists()
            && source_dmg.is_file()
            && source_dmg.extension().unwrap().eq_ignore_ascii_case("dmg"),
        "Source file is not a DMG file or does not exist"
    );
    use dmg::Attach;
    let mount_info = Attach::new(source_dmg).attach().expect("could not attach");
    println!("Device node {:?}", mount_info.device);
    println!("Mounted at {:?}", mount_info.mount_point);
    Ok(mount_info)
}

fn mount_and_extract_dmg(source_dmg: PathBuf, target_dir: PathBuf) -> Result<()> {
    let mount_info = mount(source_dmg)?;
    let cdda_app = mount_info.mount_point.join("Cataclysm.app");
    ensure!(
        &cdda_app.exists(),
        format!("Cataclysm.app not found in DMG: {:?}", &cdda_app)
    );
    use fs_extra::dir::CopyOptions;
    let options = CopyOptions::new()
        .buffer_size(1024 * 1024 * 10) // 10 MB
        .overwrite(true);
    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir)?;
    }
    let handle = |process_info: fs_extra::TransitProcess| {
        info!("copied bytes {}", process_info.copied_bytes);
        fs_extra::dir::TransitProcessResult::ContinueOrAbort
    };

    fs_extra::copy_items_with_progress(&[cdda_app.clone()], target_dir, &options, handle)?;
    mount_info.detach().expect("could not detach");
    Ok(())
}

pub mod commands {
    use super::*;

    #[tauri::command]
    pub fn extract_dmg(source_dmg: String, target_dir: String) -> Result<(), String> {
        // let dummy_source =
        //     PathBuf::from("/Users/fanjiang/Downloads/CDDA OSX Tiles Universal 2024-06-18.dmg");
        // let dummy_target =
        //     PathBuf::from("/Users/fanjiang/Downloads/cdda-experimental-2024-06-18-0730/");
        // extract_data(dummy_source, dummy_target).map_err(|e| e.to_string())
        //
        let source = PathBuf::from(source_dmg);
        let target = PathBuf::from(target_dir);
        mount_and_extract_dmg(source, target).map_err(|e| e.to_string())
    }
}
