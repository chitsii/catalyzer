// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(unused_imports)]
mod prelude {

    pub use crate::model::{LocalVersion, Mod, ModInfo};
    pub use crate::profile::AppState;

    pub use anyhow::{ensure, Context as _, Result};
    pub use log::{debug, error, info, warn};
    pub use std::path::{Path, PathBuf};

    pub use tauri::async_runtime::Mutex;
}

use log::LevelFilter;
use tauri_plugin_log::{LogTarget, RotationStrategy, TimezoneStrategy};

use prelude::*;

use std::{fs::read_to_string, process::Command};
use tauri::{api::path::executable_dir, Manager};

mod logic;
use logic::utils::get_modinfo_path;

mod model;
use model::{LocalVersion, Mod, ModInfo};

mod git;
use git::open;
mod profile;
use profile::{AppState, Profile, Settings};
mod symlink;
mod zip;

fn main() {
    debug!("Starting up CDDA Mod Manager.");

    const MAX_LOG_FILE_SIZE: u128 = 10_000_000;

    let app_state = AppState::new();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    LogTarget::Stdout,
                    LogTarget::Webview,
                    LogTarget::Folder(crate::profile::get_config_root().join("logs")),
                ])
                .timezone_strategy(TimezoneStrategy::UseLocal)
                .rotation_strategy(RotationStrategy::KeepOne)
                .max_file_size(MAX_LOG_FILE_SIZE)
                .level(LevelFilter::Debug)
                .build(),
        )
        .setup(|app| {
            info!("Welcome to the CDDA mod manager! Starting up...");
            // 開発時だけdevtoolsを表示する。
            #[cfg(debug_assertions)]
            app.get_window("main").unwrap().open_devtools();
            Ok(())
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            scan_mods,
            open_dir,
            open_mod_data,
            tail_log,
            launch_game,
            symlink::commands::install_mod,
            symlink::commands::uninstall_mod,
            zip::commands::unzip_mod_archive,
            git::commands::git_init,
            git::commands::git_commit_changes,
            git::commands::git_reset_changes,
            git::commands::git_list_branches,
            git::commands::git_checkout,
            profile::commands::get_settings,
            profile::commands::add_profile,
            profile::commands::remove_profile,
            profile::commands::edit_profile,
            profile::commands::set_profile_active,
            profile::commands::get_active_profile,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            error!("Error while running tauri application: {}", e);
            std::process::exit(1);
        });
}

#[tauri::command]
fn scan_mods(state: tauri::State<'_, AppState>) -> Result<Vec<Mod>, String> {
    let settings = state.get_settings().unwrap();

    let mods = settings.scan_mods().unwrap();
    Ok(mods)
}

#[tauri::command]
fn open_dir(target_dir: String) {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &target_dir]) // The comma after select is not a typo
            .spawn()
            .unwrap();
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            // .args(["-R", &target_dir])
            .args([&target_dir])
            .spawn()
            .unwrap();
    }
    #[cfg(target_os = "linux")]
    {
        if path.contains(",") {
            // see https://gitlab.freedesktop.org/dbus/dbus/-/issues/76
            let new_path = match metadata(&path).unwrap().is_dir() {
                true => path,
                false => {
                    let mut path2 = PathBuf::from(path);
                    path2.pop();
                    path2.into_os_string().into_string().unwrap()
                }
            };
            Command::new("xdg-open").arg(&new_path).spawn().unwrap();
        } else {
            if let Ok(Fork::Child) = daemon(false, false) {
                Command::new("dbus-send")
                    .args([
                        "--session",
                        "--dest=org.freedesktop.FileManager1",
                        "--type=method_call",
                        "/org/freedesktop/FileManager1",
                        "org.freedesktop.FileManager1.ShowItems",
                        format!("array:string:\"file://{path}\"").as_str(),
                        "string:\"\"",
                    ])
                    .spawn()
                    .unwrap();
            }
        }
    }
}

#[tauri::command]
fn open_mod_data(state: tauri::State<'_, AppState>) {
    let setting = state.get_settings().unwrap();
    open_dir(setting.mod_data_path.to_string_lossy().to_string());
}

#[tauri::command]
fn tail_log() -> Vec<String> {
    let log_path = profile::get_config_root().join("logs");
    let log_file = log_path
        .read_dir()
        .unwrap()
        .find(|entry| {
            let entry = entry.as_ref().unwrap();
            entry.path().extension().unwrap() == "log"
        })
        .unwrap()
        .unwrap();
    let content = read_to_string(log_file.path()).unwrap();

    const MAX_LINES: usize = 20;
    let lines: Vec<String> = content.lines().map(|line| line.to_string()).collect();
    let start = if lines.len() > MAX_LINES {
        lines.len() - MAX_LINES
    } else {
        0
    };
    lines[start..].to_vec()
}

#[tauri::command]
fn launch_game(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let setting = state.get_settings().unwrap();

    let profile = setting.get_active_profile();
    let game_path = profile.game_path.clone().unwrap();
    let userdata_path = profile.profile_path.root.clone();

    // game_pathが存在しない場合はエラーを返して表示する
    if !game_path.exists() {
        return Err(format!("Game path does not exist: {:?}", game_path));
    }
    launch(game_path, userdata_path).map_err(|e| format!("Failed to launch the game: {}", e))?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn launch(game_path: PathBuf, userdata_path: PathBuf) -> Result<(), String> {
    let mut p = game_path.clone();
    let file_name = p.file_name().unwrap().to_string_lossy();
    if !file_name.ends_with(".exe") {
        let maybe = p.join("cataclysm-tiles.exe");
        if maybe.exists() {
            p = maybe;
        } else {
            println!("Game path does not exist: {:?}", game_path);
            return Err(format!("Game path does not exist: {:?}", game_path));
        }
    }
    let options = format!(
        "cd /d {} && start cataclysm-tiles.exe --userdir {}",
        &game_path.parent().unwrap().to_string_lossy(),
        userdata_path.to_string_lossy()
    );
    debug!("command: {}", &options);

    Command::new("cmd")
        .args(["/C", &options])
        .spawn()
        .map_err(|e| format!("Failed to launch the game: {}", e))?;

    Ok(())
}

#[cfg(target_os = "macos")]
fn launch(game_path: PathBuf, userdata_path: PathBuf) -> Result<(), String> {
    if game_path.extension().unwrap() != "app" {
        return Err(format!("Game path does not exist: {:?}", game_path));
    }

    debug!("Launching game: {:?}", &game_path);
    Command::new("open")
        .arg(game_path)
        .arg(format!("--userdir {}", userdata_path.to_string_lossy()))
        .spawn()
        .map_err(|e| format!("Failed to launch the game: {}", e))?;
    Ok(())
}
