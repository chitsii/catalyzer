// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod prelude {
    #![allow(unused_imports)]
    pub use crate::model::{LocalVersion, Mod, ModInfo};
    pub use crate::profile::AppState;
    pub use anyhow::{anyhow, ensure, Context as _, Result};
    pub use log::{debug, error, info, warn};
    use rayon::prelude::*;
    pub use serde::{Deserialize, Serialize};
    pub use std::path::{Path, PathBuf};
    pub use tauri::async_runtime::Mutex;
}

use log::LevelFilter;
use prelude::*;
use std::{fs::read_to_string, process::Command};
use tauri::async_runtime::spawn;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};
mod logic;
mod model;
use model::Mod;
mod git;
mod profile;
use profile::AppState;
mod dmg;
mod symlink;
mod zip;

struct SetupState {
    frontend_task: bool,
    backend_task: bool,
}
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

// ===== Splash Screen Logic =====
#[tauri::command]
async fn set_complete(
    app: AppHandle,
    state: State<'_, Mutex<SetupState>>,
    task: String,
) -> Result<(), ()> {
    let mut state_lock = state.lock().unwrap();
    match task.as_str() {
        "frontend" => state_lock.frontend_task = true,
        "backend" => state_lock.backend_task = true,
        _ => panic!("invalid task completed!"),
    }
    if state_lock.backend_task && state_lock.frontend_task {
        let splash_window = app.get_webview_window("splashscreen").unwrap();
        let main_window = app.get_webview_window("main").unwrap();
        splash_window.close().unwrap();
        main_window.show().unwrap();
    }
    Ok(())
}

pub async fn setup(app: AppHandle) -> Result<(), ()> {
    // sleep(Duration::from_secs(2)).await;
    // TODO: clean settings yaml here
    set_complete(
        app.clone(),
        app.state::<Mutex<SetupState>>(),
        "backend".to_string(),
    )
    .await?;
    Ok(())
}
// =================================

fn main() {
    const MAX_LOG_FILE_SIZE: u128 = 10_000_000;
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                    Target::new(TargetKind::Folder {
                        path: crate::profile::get_app_data_dir().join("logs"),
                        file_name: Some("catalyzer".to_string()),
                    }),
                ])
                .timezone_strategy(TimezoneStrategy::UseLocal)
                .rotation_strategy(RotationStrategy::KeepOne)
                .max_file_size(MAX_LOG_FILE_SIZE)
                .level(LevelFilter::Debug)
                .build(),
        )
        .manage(AppState::new())
        .manage(Mutex::new(SetupState {
            frontend_task: true, // フロントエンドは重い処理しない
            backend_task: false,
        }))
        .invoke_handler(tauri::generate_handler![
            set_complete,
            create_profile_window,
            scan_mods,
            open_dir,
            open_mod_data,
            tail_log,
            launch_game,
            get_platform,
            symlink::commands::install_mod,
            symlink::commands::uninstall_mod,
            symlink::commands::install_all_mods,
            symlink::commands::uninstall_all_mods,
            zip::commands::unzip_mod_archive,
            zip::commands::unzip_archive,
            dmg::commands::extract_dmg,
            git::commands::git_init,
            git::commands::git_commit_changes,
            git::commands::git_reset_changes,
            git::commands::git_list_branches,
            git::commands::git_checkout,
            git::commands::git_clone_mod_repo,
            git::commands::git_fetch_all_mods,
            git::cdda::commands::cdda_is_cloned,
            git::cdda::commands::cdda_pull_rebase,
            git::cdda::commands::cdda_get_stable_releases,
            git::cdda::commands::cdda_get_latest_releases,
            git::cdda::commands::github_rate_limit,
            profile::commands::get_settings,
            profile::commands::get_current_profile,
            profile::commands::add_profile,
            profile::commands::edit_profile,
            profile::commands::remove_profile,
            profile::commands::set_profile_active,
            profile::commands::get_active_profile,
            profile::commands::set_launcher_language,
        ])
        .setup(|app| {
            info!("=======================");
            info!("  Welcome, Survivor！  ");
            info!("=======================\n\n");

            spawn(setup(app.handle().clone()));

            // 開発時だけdevtoolsを表示する。
            // #[cfg(debug_assertions)]
            // app.get_webview_window("main").unwrap().open_devtools();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_platform() -> String {
    #[cfg(target_os = "windows")]
    {
        "windows".to_string()
    }
    #[cfg(target_os = "macos")]
    {
        "macos".to_string()
    }
    #[cfg(target_os = "linux")]
    {
        panic!("Linux is not supported yet.");
    }
}

#[tauri::command]
async fn create_profile_window(app: tauri::AppHandle) -> Result<(), String> {
    match tauri::WebviewWindowBuilder::new(
        &app,
        "profile_window",
        tauri::WebviewUrl::App("webviews/profile".into()),
    )
    .inner_size(800., 400.)
    .title("Catalyzer - Profile Creation")
    .resizable(false)
    .build()
    {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn scan_mods(state: tauri::State<'_, AppState>) -> Result<Vec<Mod>, String> {
    let settings = state.get_settings().unwrap();

    let mods = match settings.scan_mods() {
        Ok(mods) => mods,
        Err(e) => {
            warn!("Failed to scan mods: {}", e);
            Vec::new()
        }
    };
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
    // #[cfg(target_os = "linux")]
    // {
    //     if path.contains(",") {
    //         // see https://gitlab.freedesktop.org/dbus/dbus/-/issues/76
    //         let new_path = match metadata(&path).unwrap().is_dir() {
    //             true => path,
    //             false => {
    //                 let mut path2 = PathBuf::from(path);
    //                 path2.pop();
    //                 path2.into_os_string().into_string().unwrap()
    //             }
    //         };
    //         Command::new("xdg-open").arg(&new_path).spawn().unwrap();
    //     } else {
    //         if let Ok(Fork::Child) = daemon(false, false) {
    //             Command::new("dbus-send")
    //                 .args([
    //                     "--session",
    //                     "--dest=org.freedesktop.FileManager1",
    //                     "--type=method_call",
    //                     "/org/freedesktop/FileManager1",
    //                     "org.freedesktop.FileManager1.ShowItems",
    //                     format!("array:string:\"file://{path}\"").as_str(),
    //                     "string:\"\"",
    //                 ])
    //                 .spawn()
    //                 .unwrap();
    //         }
    //     }
    // }
}

#[tauri::command]
fn open_mod_data(state: tauri::State<'_, AppState>) {
    let setting = state.get_settings().unwrap();
    let mod_dir_path = setting.get_mod_data_dir();
    open_dir(mod_dir_path.to_str().unwrap().to_string());
}

#[tauri::command]
fn tail_log() -> Vec<String> {
    const MAX_LINES: usize = 20;

    let log_path = profile::get_app_data_dir().join("logs");
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

    let game_path = profile.get_game_path();
    let userdata_path = profile.get_profile_root_dir();

    match game_path {
        Some(path) => {
            profile.create_dir_if_unexist();
            launch(path, userdata_path).map_err(|e| format!("Failed to launch the game: {}", e))?;
        }
        None => {
            return Err("Game path is not set".to_string());
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn launch(game_path: PathBuf, userdata_path: PathBuf) -> Result<(), String> {
    let options = format!(
        "cd /d {} && start cataclysm-tiles.exe --userdir {}\\",
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

    let resource_dir = game_path.join("Contents").join("Resources");
    resource_dir.try_exists().unwrap();

    // 実行権限付与
    Command::new("chmod")
        .args(["+x", resource_dir.join("cataclysm-tiles").to_str().unwrap()])
        .spawn()
        .map_err(|e| format!("Failed to launch the game: {}", e))?;

    // refer to: Cataclysm.app/Contents/MacOS/Cataclysm.sh
    Command::new("sh")
        .arg("-c")
        .arg(format!(
            "cd '{}' && export DYLD_LIBRARY_PATH=. && export DYLD_FRAMEWORK_PATH=. && ./cataclysm-tiles --userdir '{}/'",
            resource_dir.to_string_lossy(),
            userdata_path.to_string_lossy()
        ))
        .spawn()
        .map_err(|e| format!("Failed to launch the game: {}", e))?;
    Ok(())
}
