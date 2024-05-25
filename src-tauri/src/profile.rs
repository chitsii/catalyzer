use crate::prelude::*;

use crate::git::commands::git_checkout;
use crate::logic::utils::{copy_dir_all, remove_dir_all};
use crate::model::Mod;
// use crate::symlink::commands::{create_symlink, remove_symlink};
use crate::logic::utils::{get_modinfo_path, list_symlinks};
use crate::symlink::create_symbolic_link;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::api::path::{app_config_dir, config_dir, data_dir};

const SETTINGS_FILENAME: &str = "setting.yaml";
fn get_config_root() -> PathBuf {
    let exe_path = std::env::current_exe().unwrap();
    exe_path.parent().unwrap().to_path_buf()
}
fn get_profile_dir(profile_name: &str) -> PathBuf {
    let config_root = get_config_root();
    let profile_path = config_root.join("Profiles").join(profile_name);
    if !profile_path.exists() {
        fs::create_dir_all(&profile_path).unwrap();
    }
    profile_path
}

/// Returns the path to the game directory.
/// MacOs: ~/Library/Application Support/Cataclysm
fn get_default_game_config_path() -> PathBuf {
    let data_dir = data_dir().unwrap();
    data_dir.join("Cataclysm")
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UserDataPaths {
    root: PathBuf,
    mods: PathBuf,
    config: PathBuf,
    font: PathBuf,
    save: PathBuf,
    sound: PathBuf,
    gfx: PathBuf,
}
impl UserDataPaths {
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
    pub fn get_mod_dir(&self) -> PathBuf {
        self.mods.clone()
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Profile {
    id: String,
    name: String,
    game_path: Option<PathBuf>,  // ゲームのインストール先
    profile_path: UserDataPaths, // thisApp.exe/Proiles/{ProfileName}
    mod_status: Vec<Mod>,        // プロファイル内のModの状態
    is_active: bool,             // アクティブなプロファイルかどうか
}
impl Profile {
    pub fn new(id: String, name: String, game_path: Option<PathBuf>) -> Self {
        let profile_dir = get_profile_dir(&name);
        Self {
            id,
            name: name.clone(),
            game_path,
            profile_path: UserDataPaths::new(profile_dir),
            mod_status: Vec::new(),
            is_active: false,
        }
    }
    pub fn create_dir_if_unexist(&self) {
        let paths = [
            &self.profile_path.root,
            &self.profile_path.mods,
            &self.profile_path.config,
            &self.profile_path.font,
            &self.profile_path.save,
            &self.profile_path.sound,
            &self.profile_path.gfx,
        ];
        for path in paths {
            if !path.exists() {
                fs::create_dir_all(path).unwrap();
            }
        }
    }
}
impl Default for Profile {
    fn default() -> Self {
        let mut default = Profile::new("default".to_string(), "default".to_string(), None);
        default.is_active = true;
        default.create_dir_if_unexist();
        default
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Settings {
    pub language: String,
    pub mod_data_path: PathBuf,
    pub game_config_path: UserDataPaths,
    pub profiles: Vec<Profile>,
}
impl Default for Settings {
    fn default() -> Self {
        let default = Self {
            language: "ja".into(),
            game_config_path: UserDataPaths::new(get_default_game_config_path()),
            mod_data_path: get_config_root().join("ModData"),
            profiles: vec![Profile::default()],
        };
        default.write_file();

        default
    }
}
impl Settings {
    fn post_init(&mut self) {
        // 必須ディレクトリ作成
        self.create_dirs_if_unexist();

        self.refresh_mod_status();
        // Modの状態を取得
        // let mods = crate::get_mod_status(&self.game_config_path.mods, &self.mod_data_path);
        // match mods {
        //     Ok(mods) => {
        //         self.save_mod_status();
        //     }
        //     Err(e) => {
        //         println!("Failed to get mod status on initialize: {}", e);
        //     }
        // }

        // saveファイルのシンボリックリンクを作成
        self.switch_save_dir_symlink(&self.get_active_profile())
            .unwrap();
        self.write_file();
    }

    fn create_dirs_if_unexist(&self) {
        let to_create = [&self.mod_data_path];
        for path in to_create {
            if !path.exists() {
                fs::create_dir_all(path).unwrap();
            }
        }
    }

    fn switch_save_dir_symlink(&self, profile: &Profile) -> Result<()> {
        let game_save_dir = self.game_config_path.save.clone();
        let profile_save_dir = profile.profile_path.save.clone();

        // game_save_dirが通常のディレクトリならrenameする。シンボリックリンクなら消す
        if game_save_dir.exists() {
            let meta = game_save_dir.symlink_metadata().unwrap();
            if meta.file_type().is_symlink() {
                fs::remove_file(&game_save_dir)?;
            } else {
                let backup_dir = game_save_dir.with_file_name(format!(
                    "save_backup_{}",
                    chrono::Local::now().format("%Y%m%d%H%M%S")
                ));
                fs::rename(&game_save_dir, backup_dir)?;
            }
        }

        // if game_save_dir
        //     .symlink_metadata()
        //     .map(|e| e.file_type().is_symlink())
        //     .unwrap_or(false)
        // {
        //     fs::remove_file(&game_save_dir)?;
        // }
        create_symbolic_link(&profile_save_dir, &game_save_dir)?;
        Ok(())
    }

    /// プロファイルの設定を反映する
    fn sync_mod_stats_to(&self, profile: &Profile) -> Result<()> {
        crate::logic::utils::cleanup_symlinks(&self.game_config_path.mods)?;

        profile.mod_status.iter().for_each(|m| {
            if m.is_installed {
                let src = m.local_path.clone();
                let dir_name = Path::new(&src).file_name().unwrap();
                let dest = self.game_config_path.mods.join(dir_name);
                create_symbolic_link(Path::new(&src), &dest).unwrap();

                if let Some(branch_name) = m.local_version.clone().map(|e| e.branch_name.clone()) {
                    match git_checkout(src, branch_name, false) {
                        Ok(_) => (),
                        Err(e) => {
                            println!("Failed to checkout branch: {}", e);
                        }
                    }
                }
            }
        });
        Ok(())
    }

    fn remove_profile_dir(&self, profile: &Profile) {
        let profile_dir = &profile.profile_path.root;
        println!("Removing profile dir: {:?}", profile_dir);
        if profile_dir.exists() {
            remove_dir_all(profile_dir, None).unwrap();
        }
    }

    pub fn new() -> Self {
        let config_file = get_config_root().join(SETTINGS_FILENAME);
        if !config_file.exists() {
            let mut settings = Self::default();
            settings.post_init();
            settings
        } else {
            let mut settings = Self::default();
            settings.read_file()
        }
    }
    pub fn add_profile(&mut self, new_profile: Profile) {
        new_profile.create_dir_if_unexist();
        self.profiles.push(new_profile.clone());
        self.set_active_profile(new_profile.id.clone()).unwrap();
        self.write_file();
    }
    pub fn remove_profile(&mut self, profile_id: String) {
        let index = self
            .profiles
            .iter()
            .position(|x| x.id == profile_id)
            .unwrap();

        // TODO: remove profile directory
        let profile = &self.profiles[index];
        self.remove_profile_dir(profile);

        self.profiles.remove(index); // indexがズレるので最後に呼ぶ
        self.write_file();
    }

    pub fn set_active_profile(&mut self, profile_id: String) -> Result<()> {
        self.profiles
            .iter_mut()
            .for_each(|p| p.is_active = p.id == profile_id);
        let target_profile = self.get_active_profile();
        ensure!(
            target_profile.id == profile_id,
            "Failed to set active profile"
        );
        self.sync_mod_stats_to(&target_profile)?;
        self.refresh_mod_status()?;
        self.switch_save_dir_symlink(&target_profile)?;

        self.write_file();
        Ok(())
    }
    pub fn get_active_profile(&self) -> Profile {
        let res = self.profiles.iter().find(|x| x.is_active);
        match res {
            None => Profile::default(),
            Some(p) => p.clone(),
        }
    }

    pub fn scan_mods(&self) -> Result<Vec<Mod>> {
        let game_mod_dir = self.game_config_path.mods.clone();
        let mod_data_dir = self.mod_data_path.clone();

        let mut mods = Vec::new();

        // シンボリックリンクの一覧を取得
        let existing_symlinks = list_symlinks(game_mod_dir.to_string_lossy().to_string());
        let existing_symlinks = match existing_symlinks {
            Ok(data) => data,
            Err(e) => {
                println!("Failed to list symlinks: {}", e);
                ensure!(false, "Failed to list symlinks");
                unreachable!();
            }
        };

        // Modディレクトリを走査
        let entries = std::fs::read_dir(mod_data_dir)?;
        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            let modinfo_path = match get_modinfo_path(&path) {
                Ok(d) => d,
                Err(e) => {
                    println!("{:}", e);
                    continue;
                }
            };

            // Mod情報の取得
            let info = match ModInfo::from_path(&modinfo_path) {
                Ok(info) => info,
                Err(e) => {
                    println!("Failed to read modinfo.json: {}", e);
                    continue;
                }
            };

            // 断面管理情報の取得
            let res = crate::git::open(path.display().to_string());
            let local_version = match res {
                Ok(repo) => {
                    let head = repo.head()?;
                    let head_branch = &head.name().unwrap();
                    let head_branch = head_branch.split('/').last().unwrap();
                    let last_commit = &head.peel_to_commit().unwrap();
                    let last_commit_date = last_commit.time().seconds();
                    let last_commit_date =
                        chrono::DateTime::<chrono::Utc>::from_timestamp(last_commit_date, 0)
                            .unwrap();
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
                .any(|path| path.file_name().unwrap().eq(mod_dir_name));
            let m = Mod {
                info,
                local_version,
                is_installed,
                local_path: path.display().to_string(),
            };
            mods.push(m);
        }
        Ok(mods)
    }

    pub fn refresh_mod_status(&mut self) -> Result<()> {
        let mods = self.scan_mods()?;

        let active_profile = self.get_active_profile();
        println!(
            "******Refreshing mod status for profile: {:?}",
            active_profile.name
        );
        println!("******Found {} mods", mods.len());

        self.profiles.iter_mut().for_each(|p| {
            if p.id.eq(&active_profile.id) {
                p.mod_status = mods.clone();
            }
        });
        println!(
            "******Mod status refreshed: {:?}",
            self.get_active_profile().mod_status.len()
        );
        self.write_file();
        Ok(())
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
        let serialized = serde_yaml::to_string(self).unwrap();
        // let serialized = toml::to_string(self).unwrap();
        let mut file = fs::File::create(config_file).unwrap();
        file.write_all(serialized.as_bytes()).unwrap();
    }
    fn read_file(&mut self) -> Settings {
        let config_root = get_config_root();
        let config_file = config_root.join(SETTINGS_FILENAME);
        let input = fs::read_to_string(config_file).unwrap();
        let deserialized: Result<Settings, serde_yaml::Error> = serde_yaml::from_str(&input);
        match deserialized {
            Ok(settings) => settings,
            Err(_) => {
                println!("Error: Failed to read config file");
                self.clone()
            }
        }
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
    pub fn refresh_mod_status(&self) {
        let mut settings = self.settings.lock().unwrap();
        settings.refresh_mod_status().unwrap();
    }

    pub fn get_settings(&self) -> Settings {
        let settings = self.settings.lock().unwrap();
        settings.clone()
    }
}

pub mod commands {
    use super::*;

    #[tauri::command]
    pub async fn get_settings(state: tauri::State<'_, AppState>) -> Result<Settings, String> {
        let settings = state.settings.lock().unwrap();
        Ok(settings.clone())
    }

    #[tauri::command]
    pub async fn list_profiles(state: tauri::State<'_, AppState>) -> Result<Vec<Profile>, String> {
        let settings = state.settings.lock().unwrap();
        Ok(settings.profiles.clone())
    }

    #[tauri::command]
    pub async fn add_profile(
        state: tauri::State<'_, AppState>,
        id: String,
        name: String,
        game_path: Option<String>,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();

        let new_profile = Profile::new(id, name, game_path.map(PathBuf::from));
        settings.add_profile(new_profile);
        settings.write_file();
        Ok(())
    }

    #[tauri::command]
    pub async fn remove_profile(
        state: tauri::State<'_, AppState>,
        profile_id: String,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();
        let current = settings.get_active_profile();
        if current.id == profile_id {
            // switch to default profile
            settings.set_active_profile("default".to_string());
        }
        settings.remove_profile(profile_id);
        Ok(())
    }

    #[tauri::command]
    pub async fn set_profile_active(
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
        let res = settings.get_active_profile();
        Ok(res)
    }

    #[tauri::command]
    pub async fn edit_profile(
        state: tauri::State<'_, AppState>,
        profile_id: String,
        name: String,
        game_path: Option<String>,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();
        let index = settings
            .profiles
            .iter()
            .position(|x| x.id == profile_id)
            .unwrap();

        let old_name = settings.profiles[index].name.clone();
        if old_name != name {
            let profile_path = get_profile_dir(&name);
            settings.profiles[index].profile_path = UserDataPaths::new(profile_path);

            settings.profiles[index].name = name;
        }
        settings.profiles[index].game_path = game_path.map(PathBuf::from);
        settings.write_file();
        Ok(())
    }
}
