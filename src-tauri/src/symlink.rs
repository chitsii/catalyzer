pub mod commands {
    #[tauri::command]
    pub fn create_symlink(source_dir: String, target_dir: String) -> Result<(), String> {
        println!("Creating symlink from {} to {}", source_dir, target_dir);

        let source = std::path::Path::new(&source_dir);
        let target = std::path::Path::new(&target_dir);

        if !source.exists() || !source.is_dir() {
            return Err(format!("Source is Invalid: {}", source.display()));
        }
        if target.exists() {
            return Err(format!("Target is invalid: {}", target.display()));
        }

        match std::os::unix::fs::symlink(source, target) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to create symlink: {}", e)),
        }
    }

    #[tauri::command]
    pub fn remove_symlink(target_file: String) -> Result<(), String> {
        println!("Unlinking symlink at {}", target_file);
        let target = std::path::Path::new(&target_file);
        if !target.exists() {
            return Err(format!(
                "Target directory does not exist: {}",
                target.display()
            ));
        }
        match std::fs::remove_file(target) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to remove symlink: {}", e)),
        }
    }
}
