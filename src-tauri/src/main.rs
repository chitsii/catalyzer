// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;

use tauri::Manager;

mod logic;

use logic::utils::{get_modinfo_path, list_symlinks};

mod model;
use model::{LocalVersion, Mod, ModInfo};

mod git;
use git::git_open;
mod profile;
use profile::AppState;
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
            show_in_folder,
            symlink::commands::create,
            symlink::commands::remove,
            zip::commands::unzip_mod_archive,
            git::commands::init,
            git::commands::commit_changes,
            git::commands::reset_changes,
            git::commands::list_branches,
            git::commands::checkout,
            profile::commands::get_settings,
            profile::commands::list_profiles,
            profile::commands::add_profile,
            profile::commands::remove_profile,
            profile::commands::edit_profile,
            profile::commands::set_active_profile,
            profile::commands::get_active_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn scan_mods(source_dir: String, target_dir: String) -> Result<Vec<Mod>, String> {
    let existing_symlinks = list_symlinks(target_dir.clone()).unwrap();

    let mut mods = Vec::new();

    let entries = std::fs::read_dir(source_dir.clone()).unwrap();
    for entry in entries {
        let entry = entry.unwrap();
        let path = entry.path();
        let modinfo_path = match get_modinfo_path(&path) {
            Ok(d) => d,
            Err(e) => {
                println!("{:}", e);
                continue;
            }
        };
        // Mod情報取得
        let info = match ModInfo::from_path(&modinfo_path) {
            Ok(info) => info,
            Err(e) => {
                println!("Failed to read modinfo.json: {}", e);
                continue;
            }
        };

        // 断面管理情報
        let res = git_open(path.display().to_string());
        let local_version = match res {
            Ok(repo) => {
                let head = repo.head().unwrap();
                let head_branch = &head.name().unwrap();
                let head_branch = head_branch.split('/').last().unwrap();
                let last_commit = &head.peel_to_commit().unwrap();
                let last_commit_date = last_commit.time().seconds();
                let last_commit_date =
                    chrono::DateTime::<chrono::Utc>::from_timestamp(last_commit_date, 0).unwrap();
                Some(LocalVersion {
                    branch_name: head_branch.to_string(),
                    last_commit_date: last_commit_date.to_string(),
                })
            }
            Err(e) => {
                println!("Failed to open as repository: {}", e);
                None
            }
        };

        // インストール状態取得
        let mod_dir_name = path.file_name().unwrap();
        let is_installed = existing_symlinks
            .iter()
            .any(|path| path.file_name().unwrap() == mod_dir_name);
        let m = Mod {
            info,
            local_version,
            is_installed,
            local_path: path.display().to_string(),
        };
        mods.push(m);
    }
    // println!("Mods: {:?}", mods);
    Ok(mods)
}

#[tauri::command]
fn show_in_folder(target_dir: String) {
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
            .args(["-R", &target_dir])
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
