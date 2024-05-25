use crate::prelude::*;

fn remove_file(target: &Path) -> Result<()> {
    ensure!(
        target.exists(),
        "Target directory does not exist: {}",
        target.display()
    );
    std::fs::remove_file(target)?;
    Ok(())
}

pub fn create_symbolic_link(source_dir: &Path, target_dir: &Path) -> Result<()> {
    ensure!(
        source_dir.exists() && source_dir.is_dir(),
        "Source directory does not exist or is not a directory: {:?}",
        source_dir
    );
    ensure!(
        !target_dir.exists(),
        "Target directory already exists: {:?}",
        target_dir
    );
    std::os::unix::fs::symlink(source_dir, target_dir).map_err(anyhow::Error::from)
}

pub mod commands {
    use super::*;
    use crate::profile::AppState;

    #[tauri::command]
    pub fn install_mod(
        state: tauri::State<'_, AppState>,
        source_dir: String,
        target_dir: String,
    ) -> Result<(), String> {
        create_symbolic_link(Path::new(&source_dir), Path::new(&target_dir))
            .map_err(|e| e.to_string())?;

        state.refresh_mod_save_mod_status().unwrap();
        Ok(())
    }

    #[tauri::command]
    pub fn uninstall_mod(
        state: tauri::State<'_, AppState>,
        target_file: String,
    ) -> Result<(), String> {
        remove_file(Path::new(&target_file)).map_err(|e| e.to_string())?;
        state.refresh_mod_save_mod_status().unwrap();
        Ok(())
    }
}
