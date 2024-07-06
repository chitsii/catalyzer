use crate::prelude::*;

/// Returns the path to the application's data directory.
/// On Windows, this is the directory containing the executable.
/// On macOS, this is the `cataylzer` subdirectory of the user's configuration directory.
pub fn get_app_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe().unwrap();
        exe_path.parent().unwrap().to_path_buf()
    }
    #[cfg(target_os = "macos")]
    {
        dirs::config_dir().unwrap().join("cataylzer")
    }
}

pub fn log_dir() -> PathBuf {
    get_app_data_dir().join("log")
}

pub fn cdda_clone_dir() -> PathBuf {
    let app_data_dir = get_app_data_dir();
    app_data_dir.join(".cdda").join("Cataclysm-DDA")
}

pub fn profile_dir(name_with_id: &str) -> PathBuf {
    get_app_data_dir().join("profiles").join(name_with_id)
}

pub fn moddata_dir() -> PathBuf {
    get_app_data_dir().join("moddata")
}
