pub mod commands {
    use crate::files::commands::open_dir;
    use crate::prelude::*;
    use std::process::Command;

    #[tauri::command]
    pub fn inspect_mods(state: tauri::State<'_, AppState>) -> Result<(), String> {
        let settings = state.get_settings().unwrap();
        let profile = settings.get_active_profile();
        if profile.get_game_path().is_none() {
            return Err("No active game path is set".to_string());
        }
        let target_mod_ids = profile
            .get_mod_info(true)
            .iter()
            .filter_map(|m| m.get_id())
            .collect::<Vec<_>>();
        let chk_option = format!("--check-mods {}", target_mod_ids.join(" "));
        let child = launch(
            profile.get_game_path().unwrap(),
            profile.get_profile_root_dir(),
            Some(chk_option),
        )?;
        let output = child
            .wait_with_output()
            .map_err(|e| format!("Failed to wait for the process: {}", e))?
            .stderr;
        let output = String::from_utf8(output)
            .map_err(|e| format!("Failed to convert the output to string: {}", e))?;

        let time = chrono::Local::now();
        warn!(
            r#"
===INSPECT MODS START===
Targets: {target_mod_ids:?}
Date: {time}

===INSPECT MODS RESULT==
{output}
================="#
        );
        let log_file = crate::paths::log_dir().join(format!("inspect_mods_{:?}.txt", time));
        std::fs::write(log_file.clone(), output.as_bytes())
            .map_err(|e| format!("Failed to write to the log file: {}", e))?;
        open_dir(log_file.to_string_lossy().into());
        Ok(())
    }

    #[tauri::command]
    pub fn launch_game(state: tauri::State<'_, AppState>) -> Result<(), String> {
        let setting = state.get_settings().unwrap();
        let profile = setting.get_active_profile();

        let game_path = profile.get_game_path();
        let userdata_path = profile.get_profile_root_dir();

        match game_path {
            Some(path) => {
                profile.create_dir_if_unexist();
                launch(path, userdata_path, None)
                    .map_err(|e| format!("Failed to launch the game: {}", e))?;
            }
            None => {
                return Err("Game path is not set".to_string());
            }
        };
        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn launch(
        game_path: PathBuf,
        userdata_path: PathBuf,
        extra_option_string: Option<String>,
    ) -> Result<std::process::Child, String> {
        let options = format!(
            "cd /d {} && start cataclysm-tiles.exe --userdir '{}\\' {}",
            &game_path.parent().unwrap().to_string_lossy(),
            userdata_path.to_string_lossy(),
            extra_option_string.unwrap_or_default()
        );
        debug!("command: {}", &options);
        let child = Command::new("cmd")
            .args(["/C", &options])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to launch the game: {}", e))?;
        Ok(child)
    }

    #[cfg(target_os = "macos")]
    fn launch(
        game_path: PathBuf,
        userdata_path: PathBuf,
        extra_option_string: Option<String>,
    ) -> Result<std::process::Child, String> {
        if game_path.extension().unwrap() != "app" {
            return Err(format!("Game path does not exist: {:?}", game_path));
        }
        debug!("Launching game: {:?}", &game_path);

        let resource_dir = game_path.join("Contents").join("Resources");
        resource_dir.try_exists().unwrap();

        // 実行権限付与
        Command::new("chmod")
            .args(["+x", resource_dir.join("cataclysm-tiles").to_str().unwrap()])
            .spawn()
            .map_err(|e| format!("Failed to launch the game: {}", e))?;

        // refer to: Cataclysm.app/Contents/MacOS/Cataclysm.sh
        let child = Command::new("sh")
        .arg("-c")
        .arg(format!(
            "cd '{}' && export DYLD_LIBRARY_PATH=. && export DYLD_FRAMEWORK_PATH=. && ./cataclysm-tiles --userdir '{}/' {}",
            resource_dir.to_string_lossy(),
            userdata_path.to_string_lossy(),
            extra_option_string.unwrap_or_default()
        ))
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to launch the game: {}", e))?;
        Ok(child)
    }
}
