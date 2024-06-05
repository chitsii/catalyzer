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

#[cfg(windows)]
fn remove_file(target: &Path) -> Result<()> {
    ensure!(
        target.exists(),
        "Target directory does not exist: {}",
        target.display()
    );
    use junction;
    junction::delete(target).map_err(anyhow::Error::from)
}

#[cfg(windows)]
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

pub fn list_symlinks(target_root_dir: String) -> Result<Vec<PathBuf>, String> {
    debug!("Listing symlinks in {}", &target_root_dir);

    let target = std::path::Path::new(&target_root_dir);

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
pub fn create_symbolic_link(source_dir: &Path, target_dir: &Path) -> Result<()> {
    ensure!(
        source_dir.exists() && source_dir.is_dir(),
        "Source directory does not exist or is not a directory: {:?}",
        source_dir
    );
    ensure!(
        target_dir.symlink_metadata().is_err(),
        "Target directory already exists: {:?}",
        target_dir
    );
    std::os::unix::fs::symlink(source_dir, target_dir).map_err(anyhow::Error::from)
}

#[cfg(windows)]
pub fn create_symbolic_link(source_dir: &Path, target_dir: &Path) -> Result<()> {
    ensure!(
        source_dir.exists() && source_dir.is_dir(),
        "Source directory does not exist or is not a directory: {:?}",
        source_dir
    );
    ensure!(
        target_dir.symlink_metadata().is_err(),
        "Target directory already exists: {:?}",
        target_dir
    );

    use junction;
    junction::create(target_dir, source_dir)
        .map_err(anyhow::Error::from)
        .map_err(anyhow::Error::from)
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
