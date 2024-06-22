use crate::prelude::*;
use dmg::Handle;
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Manager};

fn mount(source_dmg: PathBuf) -> Result<Handle> {
    info!("Mounting DMG: {}", source_dmg.display());
    ensure!(
        source_dmg.exists()
            && source_dmg.is_file()
            && source_dmg.extension().unwrap().eq_ignore_ascii_case("dmg"),
        "Source file is not a DMG file or does not exist"
    );
    use dmg::Attach;
    let mount_info = match Attach::new(source_dmg).attach() {
        Ok(mount_info) => mount_info,
        Err(e) => {
            return Err(anyhow!("DMG is broken: {}", e));
        }
    };
    println!("Device node {:?}", mount_info.device);
    println!("Mounted at {:?}", mount_info.mount_point);
    Ok(mount_info)
}

#[derive(Clone, Debug, serde::Serialize)]
pub struct Progress {
    progress: u64,
    total: u64,
    // percent: f64,
}

fn copy(app_handle: AppHandle, cdda_path: PathBuf, target_dir: PathBuf) -> Result<()> {
    use fs_extra::dir::CopyOptions;
    let options = CopyOptions::new()
        // .buffer_size(1024 * 1024 * 10) // 10 MB
        .overwrite(true);
    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir)?;
    }

    let mut last_emit = std::time::Instant::now();
    let event_handle = |process_info: fs_extra::TransitProcess| {
        if last_emit.elapsed() > std::time::Duration::from_millis(1000) {
            info!(
                "Copying {} of {} bytes",
                process_info.copied_bytes, process_info.total_bytes
            );
            let app_handle_spawn = app_handle.clone();
            // spawn_blocking(move || {
            app_handle_spawn
                .emit(
                    "EXTRACT_PROGRESS",
                    Progress {
                        progress: process_info.copied_bytes,
                        total: process_info.total_bytes,
                    },
                )
                .unwrap();
            // });
            last_emit = std::time::Instant::now();
        }
        fs_extra::dir::TransitProcessResult::ContinueOrAbort
    };
    fs_extra::copy_items_with_progress(&[cdda_path.clone()], target_dir, &options, event_handle)?;
    Ok(())
}

fn mount_and_copy(handle: AppHandle, cdda_path: PathBuf, target_dir: PathBuf) -> Result<()> {
    let mount_info = mount(cdda_path.clone())?;
    copy(
        handle,
        mount_info.mount_point.join("Cataclysm.app"),
        target_dir,
    )?;
    mount_info.detach()?;
    Ok(())
}

pub mod commands {
    use super::*;

    #[tauri::command]
    pub fn extract_dmg(
        handle: AppHandle,
        source_dmg: String,
        target_dir: String,
    ) -> Result<(), String> {
        let source_dmg = PathBuf::from(source_dmg);
        let target_dir = PathBuf::from(target_dir);
        mount_and_copy(handle, source_dmg, target_dir).map_err(|e| e.to_string())?;
        Ok(())
    }
}
