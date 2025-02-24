use crate::prelude::*;

// #[cfg(unix)]
// fn remove_file(target: &Path) -> Result<()> {
//     ensure!(
//         target.exists(),
//         "Target directory does not exist: {}",
//         target.display()
//     );
//     std::fs::remove_file(target)?;
//     Ok(())
// }

// #[cfg(target_os = "windows")]
// fn remove_file(target: &Path) -> Result<()> {
//     ensure!(
//         target.exists(),
//         "Target directory does not exist: {}",
//         target.display()
//     );
//     use junction;
//     junction::delete(target)?;
//     // std::fs::remove_file(target)?; // junctionを消すと空のディレクトリが残るので、それを削除する
//     std::fs::remove_dir(target)?; // junctionを消すと空のディレクトリが残るので、それを削除する

//     Ok(())
// }

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
    // debug!("Listing symlinks in {}", &target_root_dir.display());

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
                    // debug!("Symlink: {}", path.display());
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
