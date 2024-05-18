// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use tauri::api::path::{app_config_dir, config_dir, data_dir};
use tauri::Manager;
use tempfile::tempdir;

mod logic;
use logic::git_cmd::{
    git_checkout, git_commit, git_init, git_list_branches, git_open, git_reset_hard,
};
use logic::utils::{
    copy_dir_all, get_modinfo_path, get_shallowest_mod_dir, list_symlinks, remove_dir_all,
};
use logic::zip::fix_zip_fname_encoding;

mod model;
use model::{LocalVersion, Mod, ModInfo};

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
            remove_symlink,
            create_symlink,
            init_local_repository,
            commit_changes,
            reset_changes,
            list_branches,
            checkout_branch,
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
fn remove_symlink(target_file: String) -> Result<(), String> {
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
    // cleanup: Option<bool>,
) -> Result<(), String> {
    let repo = git_open(target_dir.clone()).unwrap();

    let has_created = match git_checkout(&repo, &target_branch, create_if_unexist) {
        Ok(has_created) => has_created,
        Err(e) => return Err(e),
    };

    // if has_created && cleanup.is_some_and(|x| x) {
    //     let entries = std::fs::read_dir(target_dir).unwrap();
    //     for entry in entries {
    //         let entry = entry.unwrap();
    //         let path = entry.path();
    //         if path.is_dir() && (!path.file_name().unwrap().eq_ignore_ascii_case(".git")) {
    //             std::fs::remove_dir_all(&path).unwrap();
    //         } else {
    //             std::fs::remove_file(&path).unwrap_or_else(|_| println!("{:?}", path.clone()))
    //         }
    //     }
    // }
    git_reset_hard(&repo).unwrap();

    Ok(())
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
    let tmp_dir_zip = tempdir().unwrap();
    let tmp_dir_zip_path = tmp_dir_zip.path();
    println!("tmp zip dir {}", tmp_dir_zip_path.display());

    // src_pathのファイル名の文字コードを修正
    // temp_dir/{srcのファイル名}に修正版のzipファイルを作成
    let filename = src_path.file_name().unwrap().to_str().unwrap();
    let fixed_src_path = fix_zip_fname_encoding(
        src_path.display().to_string(),
        tmp_dir_zip_path.join(filename).display().to_string(),
    )
    .map_err(|e| format!("Failed to fix encoding of ZIP archive: {}", e))?;
    println!("Fixed zip file created: {}", fixed_src_path);

    let archive: Vec<u8> = std::fs::read(fixed_src_path).unwrap();
    let archive = std::io::Cursor::new(archive);

    let tmp_dir = tempdir().unwrap();
    let tmp_dir_path = tmp_dir.path();
    println!("tmp extract mod to {}", tmp_dir_zip_path.display());

    match zip_extract::extract(archive, tmp_dir_path, true) {
        Ok(_) => {
            // find if there is a mod directory in the extracted files
            let mod_dir = get_shallowest_mod_dir(tmp_dir_path);

            // if None, remove tmp_dir and return error
            match mod_dir {
                Some(mod_dir) => {
                    // if dest_path exists, overwrite (merge) the mod directory.
                    if exists_ok.is_some_and(|x| x) && dest_path.exists() {
                        println!("Removing existing directory: {}", dest_path.display());
                        remove_dir_all(&dest_path, ".git").unwrap();
                        println!("Merging mod directory to {}", dest_path.display());
                        copy_dir_all(&mod_dir, &dest_path, ".git").unwrap();
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

// Settings

use std::sync::Mutex;
use std::{fs, mem};

const SETTINGS_FILENAME: &str = "setting.json";
fn get_config_root() -> PathBuf {
    let exe_path = std::env::current_exe().unwrap();
    exe_path.parent().unwrap().to_path_buf()
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct ProfilePath {
    root: PathBuf,
    mods: PathBuf,
    config: PathBuf,
    font: PathBuf,
    save: PathBuf,
    sound: PathBuf,
    gfx: PathBuf,
}
impl ProfilePath {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root: root.clone(),
            mods: root.join("mods"),
            config: root.join("config"),
            font: root.join("font"),
            save: root.join("save"),
            sound: root.join("sound"),
            gfx: root.join("gfx"),
        }
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct Profile {
    id: String,
    name: String,
    game_path: PathBuf,
    profile_path: ProfilePath,
    active_mods: Vec<String>,
    branch_name: String,
    theme: String,
    is_active: bool,
}
// TODO
// impl Profile {
//     pub fn copy_from_game_config(&self) -> Result<(), String> {
//         let default_game_config_dir = config_dir().unwrap().join("Cataclysm");
//         let game_config = default_game_config_dir;
//         if !game_config.exists() {
//             return Err(
//                 "game config directory does not exist. Lauch the game once to create it."
//                     .to_string(),
//             );
//         }

//         if self.root.exists() {
//             return Err("Profile already exists".to_string());
//         }
//         copy_dir_all(game_config, &self.root, ".git").unwrap();
//         Ok(())
//     }
// }

#[derive(Debug, Deserialize, Serialize, Clone)]
struct Settings {
    language: String,
    profile: Vec<Profile>,
}
impl Default for Settings {
    fn default() -> Self {
        let data_dir = data_dir().unwrap();
        let default_profie = Profile {
            id: "default".to_string(),
            name: "Default".to_string(),
            game_path: data_dir.join("Cataclysm"),
            profile_path: ProfilePath::new(data_dir.join("Cataclysm")),
            active_mods: Vec::new(),
            branch_name: "main".to_string(),
            theme: "system".to_string(),
            is_active: true,
        };

        Self {
            language: "ja".to_string(),
            profile: vec![default_profie],
        }
    }
}
impl Settings {
    pub fn new() -> Self {
        let config_file = get_config_root().join(SETTINGS_FILENAME);
        if !config_file.exists() {
            Self::default()
        } else {
            let mut settings = Self::default();
            settings.read_file();
            settings
        }
    }
    pub fn set_language(&mut self, new_lang: String) {
        self.language = new_lang;
        self.write_file();
    }
    pub fn add_profile(&mut self, new_profile: Profile) {
        self.profile.push(new_profile);
        self.write_file();
    }
    pub fn remove_profile(&mut self, profile_id: String) {
        let index = self
            .profile
            .iter()
            .position(|x| x.id == profile_id)
            .unwrap();
        self.profile.remove(index);
        self.write_file();
    }
    pub fn set_active_profile(&mut self, profile_id: String) {
        let index = self
            .profile
            .iter()
            .position(|x| x.id == profile_id)
            .unwrap();
        for p in self.profile.iter_mut() {
            p.is_active = false;
        }
        self.profile[index].is_active = true;
        self.write_file();
    }
    pub fn get_active_profile(&self) -> &Profile {
        self.profile.iter().find(|x| x.is_active).unwrap()
    }
}

trait Config {
    fn write_file(&self) {}
    fn read_file(&mut self) -> Self;
}

impl Config for Settings {
    fn write_file(&self) {
        let config_root = get_config_root();
        if !config_root.exists() {
            fs::create_dir_all(&config_root).unwrap();
        }
        let config_file = config_root.join(SETTINGS_FILENAME);
        let serialized = serde_json::to_string(self).unwrap();
        let mut file = fs::File::create(config_file).unwrap();
        file.write_all(serialized.as_bytes()).unwrap();
    }

    fn read_file(&mut self) -> Settings {
        let config_root = get_config_root();
        let config_file = config_root.join(SETTINGS_FILENAME);
        let input = fs::read_to_string(config_file).unwrap();
        let deserialized: Self = serde_json::from_str(&input).unwrap();
        // let _ = mem::replace(self, deserialized);
        deserialized
    }
}

#[derive(Debug)]
pub struct AppState {
    settings: Mutex<Settings>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            settings: Mutex::new(Settings::new()),
        }
    }
}

pub mod commands {
    use super::*;

    #[tauri::command]
    pub async fn set_language(
        state: tauri::State<'_, AppState>,
        new_language: String,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();
        settings.set_language(new_language);
        Ok(())
    }

    #[tauri::command]
    pub async fn add_profile(
        state: tauri::State<'_, AppState>,
        new_profile: Profile,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();
        settings.add_profile(new_profile);
        Ok(())
    }

    #[tauri::command]
    pub async fn remove_profile(
        state: tauri::State<'_, AppState>,
        profile_id: String,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();
        settings.remove_profile(profile_id);
        Ok(())
    }

    #[tauri::command]
    pub async fn set_active_profile(
        state: tauri::State<'_, AppState>,
        profile_id: String,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();
        settings.set_active_profile(profile_id);
        Ok(())
    }

    #[tauri::command]
    pub async fn get_active_profile(state: tauri::State<'_, AppState>) -> Result<Profile, String> {
        let settings = state.settings.lock().unwrap();
        Ok(settings.get_active_profile().clone())
    }
}
