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
pub struct Profile {
    id: String,
    name: String,
    game_path: PathBuf,
    profile_path: ProfilePath,
    active_mods: Vec<String>,
    branch_name: String,
    theme: String,
    is_active: bool,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Settings {
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
    // pub fn set_language(&mut self, new_lang: String) {
    //     self.language = new_lang;
    //     self.write_file();
    // }
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
        let serialized = serde_yaml::to_string(self).unwrap();
        // let serialized = toml::to_string(self).unwrap();
        let mut file = fs::File::create(config_file).unwrap();
        file.write_all(serialized.as_bytes()).unwrap();
    }

    fn read_file(&mut self) -> Settings {
        let config_root = get_config_root();
        let config_file = config_root.join(SETTINGS_FILENAME);
        let input = fs::read_to_string(config_file).unwrap();
        let deserialized: Self = serde_json::from_str(&input).unwrap();
        // let deserialized: Self = toml::from_str(&input).unwrap();
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

    // #[tauri::command]
    // pub async fn set_language(
    //     state: tauri::State<'_, AppState>,
    //     new_language: String,
    // ) -> Result<(), String> {
    //     let mut settings = state.settings.lock().unwrap();
    //     settings.set_language(new_language);
    //     Ok(())
    // }
    #[tauri::command]
    pub async fn get_settings(state: tauri::State<'_, AppState>) -> Result<Settings, String> {
        let settings = state.settings.lock().unwrap();
        Ok(settings.clone())
    }

    #[tauri::command]
    pub async fn list_profiles(state: tauri::State<'_, AppState>) -> Result<Vec<Profile>, String> {
        let settings = state.settings.lock().unwrap();
        Ok(settings.profile.clone())
    }

    #[tauri::command]
    pub async fn add_profile(
        state: tauri::State<'_, AppState>,
        // new_profile: Profile,
        id: String,
        name: String,
        game_path: String,
        profile_path: String,
        branch_name: String,
        theme: Option<String>,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();
        let new_profile = Profile {
            id,
            name,
            game_path: PathBuf::from(game_path),
            profile_path: ProfilePath::new(PathBuf::from(profile_path)),
            active_mods: Vec::new(),
            branch_name,
            theme: theme.unwrap_or("system".to_string()),
            is_active: false,
        };
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
