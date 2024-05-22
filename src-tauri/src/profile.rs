use crate::logic::utils::{copy_dir_all, remove_dir_all};
use crate::model::Mod;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
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
        let default = Profile::new("default".to_string(), "default".to_string(), None);
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
        let default_mod_data_dir = get_config_root().join("ModData");
        let default = Self {
            language: "ja".into(),
            game_config_path: UserDataPaths::new(get_default_game_config_path()),
            mod_data_path: default_mod_data_dir,
            profiles: vec![Profile::default()],
        };
        default.create_dir_if_unexist();
        default
    }
}
impl Settings {
    fn create_dir_if_unexist(&self) {
        let paths = [&self.mod_data_path];
        for path in paths {
            if !path.exists() {
                fs::create_dir_all(path).unwrap();
            }
        }
    }
    fn remove_profile_dir(&self, profile: &Profile) {
        let profile_dir = &profile.profile_path.root;
        if profile_dir.exists() {
            remove_dir_all(profile_dir, "").unwrap();
        }
    }

    fn copy_files_from_game_config(
        &self,
        profile: &Profile,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let profile_dir = &profile.profile_path.root;
        let game_config = self.game_config_path.root.clone();
        let paths = [
            game_config.join("mods"),
            game_config.join("config"),
            game_config.join("font"),
            game_config.join("save"),
            game_config.join("sound"),
            game_config.join("gfx"),
        ];
        for src_dir in paths.iter() {
            if src_dir.exists() {
                let dest = profile_dir.join(src_dir.file_name().unwrap());
                if !dest.exists() {
                    fs::create_dir_all(&dest).unwrap();
                }
                copy_dir_all(src_dir, &dest, "").unwrap();
            }
        }
        Ok(())
    }
    pub fn new() -> Self {
        let config_file = get_config_root().join(SETTINGS_FILENAME);
        if !config_file.exists() {
            Self::default()
        } else {
            let mut settings = Self::default();
            settings.read_file()
        }
    }
    pub fn add_profile(&mut self, new_profile: Profile) {
        match self.copy_files_from_game_config(&new_profile) {
            Ok(_) => {
                println!("Copied files from game config");
                self.profiles.push(new_profile);
                self.write_file();
            }
            Err(e) => {
                println!("Failed to copy files from game config: {}", e);
                // remove copied files
                self.remove_profile_dir(&new_profile);
            }
        }
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
    pub fn set_active_profile(&mut self, profile_id: String) {
        let index = self
            .profiles
            .iter()
            .position(|x| x.id == profile_id)
            .unwrap();
        for p in self.profiles.iter_mut() {
            p.is_active = false;
        }
        self.profiles[index].is_active = true;
        self.write_file();
    }
    pub fn get_active_profile(&self) -> Profile {
        let res = self.profiles.iter().find(|x| x.is_active);
        match res {
            None => Profile::default(),
            Some(p) => p.clone(),
        }
    }
    pub fn update_current_mod_status(&mut self, mods: Vec<Mod>) {
        // let index = self.profiles.iter().position(|x| x.is_active).unwrap();
        let index = self.profiles.iter().position(|x| x.is_active).unwrap_or(0);
        self.profiles[index].mod_status = mods;
        self.write_file();
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
    pub fn update_current_mod_status(&self, mods: Vec<Mod>) {
        let mut settings = self.settings.lock().unwrap();
        settings.update_current_mod_status(mods);
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
