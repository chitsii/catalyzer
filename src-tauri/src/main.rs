// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod prelude {
    #![allow(unused_imports)]

    pub use crate::model::{LocalVersion, Mod, ModInfo};
    pub use crate::profile::AppState;

    pub use anyhow::{ensure, Context as _, Result};
    pub use std::path::{Path, PathBuf};
}

use prelude::*;

use std::process::Command;
use tauri::Manager;

mod logic;

use logic::utils::{get_modinfo_path, list_symlinks};

mod model;
use model::{LocalVersion, Mod, ModInfo};

mod git;
use git::open;
mod profile;
use profile::{AppState, Profile, Settings};
mod symlink;
mod zip;

fn main() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .setup(|app| {
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
            symlink::commands::install_mod,
            symlink::commands::uninstall_mod,
            zip::commands::unzip_mod_archive,
            git::commands::git_init,
            git::commands::git_commit_changes,
            git::commands::git_reset_changes,
            git::commands::git_list_branches,
            git::commands::git_checkout,
            profile::commands::get_settings,
            profile::commands::list_profiles,
            profile::commands::add_profile,
            profile::commands::remove_profile,
            profile::commands::edit_profile,
            profile::commands::set_profile_active,
            profile::commands::get_active_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn scan_mods(state: tauri::State<'_, AppState>) -> Result<Vec<Mod>, String> {
    // wait 200ms
    // std::thread::sleep(std::time::Duration::from_millis(250));

    let mut setting = state.get_settings();
    let mods = setting.scan_mods().unwrap();
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
    let setting = state.get_settings();
    open_dir(setting.mod_data_path.to_string_lossy().to_string());
}
