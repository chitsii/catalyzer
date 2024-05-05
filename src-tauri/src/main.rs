// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use tempfile::tempdir;

mod logic;
use logic::git_cmd::{
    git_checkout, git_commit, git_init, git_list_branches, git_open, git_reset_hard,
};
use logic::utils::{get_modinfo_path, get_shallowest_mod_dir, list_symlinks};

mod model;
use model::{LocalVersion, Mod, ModInfo};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            remove_file,
            create_symlink,
            init_local_repository,
            commit_changes,
            reset_changes,
            list_branches,
            checkout_branch,
            // show_changes,
            scan_mods,
            show_in_folder,
            unzip_mod_archive,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn create_symlink(source_dir: String, target_dir: String) -> Result<(), String> {
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
fn remove_file(target_file: String) -> Result<(), String> {
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

#[tauri::command]
fn init_local_repository(target_dir: String) -> Result<(), String> {
    let target = std::path::Path::new(&target_dir);
    if !target.exists() {
        return Err(format!(
            "Target directory does not exist: {}",
            target.display()
        ));
    }
    if git_open(target_dir.clone()).is_ok() {
        return Err(format!("Repository already exists at {}", target_dir));
    }
    let repo = git_init(target_dir).unwrap();
    println!("Repository initialized at {}", repo.path().display());
    git_commit(&repo, "Initial commit").unwrap();
    git_reset_hard(&repo).unwrap();
    Ok(())
}

#[tauri::command]
fn commit_changes(target_dir: String, message: Option<String>) -> Result<(), String> {
    let now = chrono::Local::now().to_string();
    let message = message.unwrap_or_else(|| format!("Changes committed at {}", now));

    let repo = match git_open(target_dir) {
        Ok(repo) => repo,
        Err(e) => return Err(e),
    };

    match git_commit(&repo, &message) {
        Ok(_) => Ok(()),
        Err(e) => Err(e),
    }
}

#[tauri::command]
fn reset_changes(target_dir: String) -> Result<(), String> {
    let repo = git_open(target_dir).unwrap();
    git_reset_hard(&repo).unwrap();
    Ok(())
}

#[tauri::command]
fn list_branches(target_dir: String) -> Result<Vec<String>, String> {
    let repo = git_open(target_dir).unwrap();
    match git_list_branches(&repo) {
        Ok(branches) => Ok(branches),
        Err(e) => Err(format!("Failed to list branches: {}", e)),
    }
}

#[tauri::command]
fn checkout_branch(
    target_dir: String,
    target_branch: String,
    create_if_unexist: bool,
    cleanup: Option<bool>,
) -> Result<(), String> {
    let repo = git_open(target_dir.clone()).unwrap();

    let has_created = match git_checkout(&repo, &target_branch, create_if_unexist) {
        Ok(has_created) => has_created,
        Err(e) => return Err(e),
    };

    if has_created && cleanup.is_some_and(|x| x) {
        let entries = std::fs::read_dir(target_dir).unwrap();
        for entry in entries {
            let entry = entry.unwrap();
            let path = entry.path();
            if path.is_dir() && (!path.file_name().unwrap().eq_ignore_ascii_case(".git")) {
                std::fs::remove_dir_all(&path).unwrap();
            } else {
                std::fs::remove_file(&path).unwrap_or_else(|_| println!("{:?}", path.clone()))
            }
        }
    }
    git_reset_hard(&repo).unwrap();

    Ok(())
}

/// return changed files
#[tauri::command]
fn show_changes(target_dir: String) -> Result<Vec<String>, String> {
    let repo = git_open(target_dir).unwrap();
    let mut changed_files = Vec::new();
    let mut diff_opts = git2::DiffOptions::new();
    diff_opts.include_untracked(true);
    let diff = repo
        .diff_index_to_workdir(None, Some(&mut diff_opts))
        .unwrap();
    diff.foreach(
        &mut |delta, _progress| {
            let new_file = delta.new_file();
            let path = new_file.path().unwrap();
            changed_files.push(path.to_string_lossy().to_string());
            true
        },
        None,
        None,
        None,
    )
    .unwrap();
    Ok(changed_files)
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
fn unzip_mod_archive(src: String, dest: String, exists_ok: Option<bool>) -> Result<(), String> {
    let src_path = std::path::PathBuf::from(src);
    let dest_path = std::path::PathBuf::from(dest).with_extension("");

    if !src_path.exists() {
        return Err(format!(
            "Source file does not exist: {}",
            src_path.display()
        ));
    }

    if exists_ok.is_some_and(|x| x) {
        if dest_path.exists() {
            println!(
                "Destination already exists, so we merge them: {}",
                dest_path.display()
            );
        }
    } else if dest_path.exists() {
        return Err(format!(
            "Destination directory already exists: {}",
            dest_path.display()
        ));
    }

    let archive: Vec<u8> = std::fs::read(src_path).unwrap();
    let archive = std::io::Cursor::new(archive);

    let tmp_dir = tempdir().unwrap();
    let tmp_dir_path = tmp_dir.path();

    match zip_extract::extract(archive, tmp_dir_path, true) {
        Ok(_) => {
            // find if there is a mod directory in the extracted files
            let mod_dir = get_shallowest_mod_dir(tmp_dir_path);

            // if None, remove tmp_dir and return error
            match mod_dir {
                Some(mod_dir) => {
                    // if dest_path exists, overwrite (merge) the mod directory.
                    if exists_ok.is_some_and(|x| x) && dest_path.exists() {
                        println!("Merging mod directory to {}", dest_path.display());
                        let entries = std::fs::read_dir(&mod_dir).unwrap();
                        for entry in entries {
                            let entry = entry.unwrap();
                            let path = entry.path();
                            let dest_path = dest_path.join(path.file_name().unwrap());
                            std::fs::rename(&path, &dest_path).unwrap();
                        }
                    } else {
                        // copy the mod directory to the destination
                        std::fs::rename(mod_dir, dest_path).unwrap();
                    }
                }
                None => {
                    // remove tmp dir and return error
                    tmp_dir.close().unwrap();
                    return Err("Failed to extract archive: Invalid mod directory".to_string());
                }
            }
            Ok(())
        }
        Err(e) => {
            tmp_dir.close().unwrap();
            Err(format!("Failed to extract archive: {}", e))
        }
    }
}
