use crate::prelude::*;
use std::{fs, io};

/// Remove all symlinks in a directory.
pub fn cleanup_symlinks(target_dir: &Path) -> Result<()> {
    ensure!(
        target_dir.exists(),
        "Directory does not exist: {:?}",
        target_dir
    );
    ensure!(target_dir.is_dir(), "Not a directory: {:?}", target_dir);

    // std::fs::remove_dir_all(target_dir)?;
    // std::fs::create_dir(target_dir)?;

    for entry in fs::read_dir(target_dir)? {
        let entry = entry?;
        let path = entry.path();

        // check if the file is a symlink
        if path.symlink_metadata()?.file_type().is_symlink() {
            fs::remove_file(&path)?;
        }
    }
    Ok(())
}

/// Remove all files in a directory, excluding files that match the exclude_pattern.
/// If exclude_pattern is None, all files will be removed including the directory itself.
pub fn remove_dir_all(path: impl AsRef<Path>, exclude_pattern: Option<&str>) -> io::Result<()> {
    if exclude_pattern.is_none() {
        fs::remove_dir_all(&path)?;
        return Ok(());
    }
    let mut skipped = 0;
    for entry in fs::read_dir(&path)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if let Some(exclude_pattern) = exclude_pattern {
            if entry.path().to_string_lossy().contains(exclude_pattern) {
                debug!("Skipping {:?}", entry.path());
                skipped += 1;
                continue;
            }
        }
        debug!("Removing {:?}", entry.path());
        if ty.is_dir() {
            fs::remove_dir_all(entry.path())?;
        } else {
            fs::remove_file(entry.path())?;
        }
    }
    if skipped < 0 {
        fs::remove_dir_all(&path)?;
    }
    Ok(())
}

/// Copy the directory recursively excluding files that match the exclude_pattern.
/// If exclude_pattern is None, all files will be copied.
pub fn copy_dir_all(
    src: impl AsRef<Path>,
    dst: impl AsRef<Path>,
    exclude_pattern: Option<&str>,
) -> io::Result<()> {
    fs::create_dir_all(&dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;

        if let Some(exclude_pattern) = exclude_pattern {
            if entry.path().to_string_lossy().contains(exclude_pattern) {
                continue;
            }
        }
        if ty.is_dir() {
            copy_dir_all(
                entry.path(),
                dst.as_ref().join(entry.file_name()),
                exclude_pattern,
            )?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

pub fn get_modinfo_path(dir: &Path) -> Result<PathBuf, String> {
    let modinfo_path = dir.join("modinfo.json");
    if !modinfo_path.exists() {
        return Err(format!("not a mod directory: {:?}", dir).to_string());
    }
    Ok(modinfo_path)
}

pub fn is_mod_dir(path: &Path) -> bool {
    get_modinfo_path(path).is_ok()
}

pub fn get_shallowest_mod_dir(path: &Path) -> Option<PathBuf> {
    let entries = std::fs::read_dir(path).unwrap();
    for entry in entries {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.is_dir() {
            if is_mod_dir(&path) {
                return Some(path);
            } else {
                let res = get_shallowest_mod_dir(&path);
                if res.is_some() {
                    return res;
                }
            }
        } else if path
            .file_name()
            .unwrap()
            .eq_ignore_ascii_case("modinfo.json")
        {
            return Some(path.parent().unwrap().to_path_buf());
        }
    }
    None
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
                if path.is_symlink() {
                    debug!("Symlink: {}", path.display());
                    symlinks.push(path);
                }
            }
            Ok(symlinks)
        }
        Err(e) => Err(format!("Failed to list symlinks: {}", e)),
    }
}
