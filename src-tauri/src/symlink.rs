use crate::prelude::*;

#[cfg(unix)]
fn remove_file(target: &Path) -> Result<()> {
    ensure!(
        target.exists(),
        "Target directory does not exist: {}",
        target.display()
    );
    std::fs::remove_file(target)?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn remove_file(target: &Path) -> Result<()> {
    ensure!(
        target.exists(),
        "Target directory does not exist: {}",
        target.display()
    );
    use junction;
    junction::delete(target)?;
    // std::fs::remove_file(target)?; // junctionを消すと空のディレクトリが残るので、それを削除する
    std::fs::remove_dir(target)?; // junctionを消すと空のディレクトリが残るので、それを削除する

    Ok(())
}

#[cfg(target_os = "windows")]
fn is_symlink(target: &Path) -> bool {
    use junction;
    match junction::exists(target) {
        Ok(b) => b,
        Err(_) => false,
    }
}

#[cfg(unix)]
fn is_symlink(target: &Path) -> bool {
    target
        .symlink_metadata()
        .map(|metadata| metadata.file_type().is_symlink())
        .unwrap_or(false)
}

pub fn list_symlinks(target_root_dir: std::path::PathBuf) -> Result<Vec<PathBuf>, String> {
    debug!("Listing symlinks in {}", &target_root_dir.display());

    let target = target_root_dir.clone();

    if !target.exists() {
        return Err(format!(
            "Target directory does not exist: {}",
            target.display()
        ));
    }

    let mut symlinks = Vec::new();

    match std::fs::read_dir(target) {
        Ok(entries) => {
            for entry in entries {
                let entry = entry.unwrap();
                let path = entry.path();
                if is_symlink(&path) {
                    debug!("Symlink: {}", path.display());
                    symlinks.push(path);
                }
            }
            Ok(symlinks)
        }
        Err(e) => Err(format!("Failed to list symlinks: {}", e)),
    }
}

#[cfg(unix)]
pub fn create_symbolic_link(source_path: &Path, target_path: &Path) -> Result<()> {
    ensure!(
        source_path.exists() && source_path.is_dir(),
        "Source directory does not exist or is not a directory: {:?}",
        source_path
    );
    ensure!(
        target_path.symlink_metadata().is_err(),
        "Target directory already exists: {:?}",
        target_path
    );
    std::os::unix::fs::symlink(source_path, target_path).map_err(anyhow::Error::from)
}

#[cfg(windows)]
pub fn create_symbolic_link(source_path: &Path, target_path: &Path) -> Result<()> {
    ensure!(
        source_path.exists() && source_path.is_dir(),
        "Source directory does not exist or is not a directory: {:?}",
        source_path
    );
    ensure!(
        target_path.symlink_metadata().is_err(),
        "Target directory already exists: {:?}",
        target_path
    );

    use junction;
    // Junctions are similar to symlinks, but are only available on Windows
    // and are limited to directories.
    // junction::create creates a junction at the target_dir that points to the source_dir.
    junction::create(source_path, target_path).map_err(anyhow::Error::from)
}

pub mod commands {
    use super::*;
    use crate::profile::AppState;

    /// 対象ディレクトリに同名のシンボリックリンクを作成する
    pub fn link_to_target_subdir(mod_data_path: &Path, target_dir: &Path) -> Result<()> {
        let mod_name = Path::new(&mod_data_path).file_name().unwrap();
        let target_path = target_dir.join(mod_name);
        create_symbolic_link(Path::new(&mod_data_path), &target_path)?;
        Ok(())
    }

    /// 対象ディレクトリ内の同名のシンボリックリンクを削除する
    /// シンボリックリンクが存在しない場合は何もしない
    pub fn unlink_target_subdir(mod_data_path: &Path, target_dir: &Path) -> Result<()> {
        let mod_name = Path::new(&mod_data_path).file_name().unwrap();
        let symlink_path = target_dir.join(mod_name);
        match remove_file(&symlink_path) {
            Ok(_) => debug!("Removed symlink at {}", symlink_path.display()),
            Err(e) => warn!("Could not remove symlink for: {}", e),
        }
        Ok(())
    }

    #[tauri::command]
    pub fn install_mod(
        state: tauri::State<'_, AppState>,
        mod_data_path: String,
    ) -> Result<(), String> {
        let target_dir = state.get_game_mod_dir();
        link_to_target_subdir(Path::new(&mod_data_path), &target_dir)
            .map_err(|e| format!("Failed to create symlink: {}", e))?;
        state.refresh_and_save_mod_status().unwrap();
        Ok(())
    }

    #[tauri::command]
    pub fn uninstall_mod(
        state: tauri::State<'_, AppState>,
        mod_data_path: String,
    ) -> Result<(), String> {
        unlink_target_subdir(Path::new(&mod_data_path), &state.get_game_mod_dir())
            .map_err(|e| format!("Failed to remove symlink: {}", e))?;
        Ok(())
    }

    #[tauri::command]
    pub fn install_all_mods(state: tauri::State<'_, AppState>) -> Result<(), String> {
        let setting = state.get_settings().unwrap();
        let profile = setting.get_active_profile();
        let mod_data_paths = profile.get_mod_local_paths();

        for mod_data_path in mod_data_paths {
            match link_to_target_subdir(Path::new(&mod_data_path), &state.get_game_mod_dir()) {
                Ok(_) => {}
                Err(e) => {
                    warn!("Mod install fail: {}", e);
                }
            }
        }
        Ok(())
    }

    #[tauri::command]
    pub fn uninstall_all_mods(state: tauri::State<'_, AppState>) -> Result<(), String> {
        let setting = state.get_settings().unwrap();
        let profile = setting.get_active_profile();
        let mod_data_paths = profile.get_mod_local_paths();

        for mod_data_path in mod_data_paths {
            let symlink_path = Path::new(&mod_data_path);
            match unlink_target_subdir(symlink_path, &state.get_game_mod_dir()) {
                Ok(_) => {}
                Err(e) => {
                    warn!("Mod uninstall fail: {}", e);
                }
            }
        }
        Ok(())
    }
}
