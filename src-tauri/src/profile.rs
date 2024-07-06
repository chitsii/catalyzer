use crate::git::{open, try_checkout_to};
use crate::logic::utils::{get_modinfo_path, remove_dir_all};
use crate::model::{LocalVersion, Mod, ModInfo};
use crate::prelude::*;
use crate::symlink::list_symlinks;
use chrono::{DateTime, Utc};
use rayon::prelude::*;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

extern crate dirs;

const SETTINGS_FILENAME: &str = "setting.yaml";

/// Returns the path to the application's data directory.
///
/// On Windows, this is the directory containing the executable.
/// On macOS, this is the `cataylzer` subdirectory of the user's configuration directory.
pub fn get_app_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe().unwrap();
        exe_path.parent().unwrap().to_path_buf()
    }
    #[cfg(target_os = "macos")]
    {
        dirs::config_dir().unwrap().join("cataylzer")
    }
}

fn get_profile_dir(name_with_id: &str) -> PathBuf {
    get_app_data_dir().join("profiles").join(name_with_id)
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UserDataPaths {
    root: PathBuf,
    pub mods: PathBuf,
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
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Profile {
    id: String,
    name: String,
    game_path: Option<PathBuf>,
    profile_path: UserDataPaths,
    mod_status: Vec<Mod>,
    is_active: bool,
}

impl Profile {
    pub fn new(id: String, name: String, game_path: Option<PathBuf>) -> Self {
        let dir_name = format!("{}_{}", &name, &id);
        let profile_dir = get_profile_dir(&dir_name);
        Self {
            id,
            name,
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
            &self.profile_path.save,
            &self.profile_path.config,
            &self.profile_path.font,
            &self.profile_path.sound,
            &self.profile_path.gfx,
        ];
        for path in paths {
            if !path.exists() {
                fs::create_dir_all(path).unwrap();
            }
        }
    }

    pub fn get_mod_info(&self, active_only: bool) -> Vec<ModInfo> {
        self.mod_status
            .iter()
            .filter(|m| !active_only || m.is_installed)
            .map(|m| m.info.clone())
            .collect()
    }

    pub fn get_mod_local_paths(&self) -> Vec<PathBuf> {
        self.mod_status
            .iter()
            .map(|m| PathBuf::from(&m.local_path))
            .collect()
    }

    pub fn get_game_path(&self) -> Option<PathBuf> {
        self.game_path.clone()
    }

    pub fn get_profile_root_dir(&self) -> PathBuf {
        self.profile_path.root.clone()
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
    pub profiles: Vec<Profile>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: "ja".into(),
            mod_data_path: get_app_data_dir().join("moddata"),
            profiles: vec![Profile::default()],
        }
    }
}

impl Settings {
    pub fn get_mod_data_dir(&self) -> PathBuf {
        get_app_data_dir().join("moddata")
    }

    fn post_init(&mut self) {
        self.create_dirs_if_unexist();
        let profile = &self.get_active_profile();
        self.mutate_state_mod_status(profile).unwrap();
        self.write_file();
    }

    fn create_dirs_if_unexist(&self) {
        if !self.mod_data_path.exists() {
            fs::create_dir_all(&self.mod_data_path).unwrap();
        }
    }

    fn apply_mod_status(&self, target_profile: &Profile) -> Result<()> {
        target_profile.mod_status.par_iter().for_each(|m| {
            if m.is_installed {
                if let Some(local_version) = &m.local_version {
                    try_checkout_to(
                        m.local_path.clone(),
                        local_version.branch_name.clone(),
                        false,
                    )
                    .unwrap_or_else(|_| {
                        debug!(
                            "Failed to checkout branch. Maybe the branch was removed: {:?}",
                            local_version.branch_name
                        )
                    });
                }
            }
        });
        Ok(())
    }

    fn remove_profile_dir(&self, profile: &Profile) {
        let profile_dir = &profile.profile_path.root;
        debug!("Removing profile dir: {:?}", profile_dir);
        if profile_dir.exists() {
            remove_dir_all(profile_dir, None).unwrap_or_else(|e| {
                warn!("{}", e);
            });
        }
    }

    pub fn new() -> Self {
        let config_file = get_app_data_dir().join(SETTINGS_FILENAME);
        if !config_file.exists() {
            let mut settings = Self::default();
            settings.post_init();
            settings
        } else {
            let mut settings = Self::default();
            settings.read_file()
        }
    }

    pub fn set_language(&mut self, lang: &str) {
        self.language = lang.to_string();
        self.write_file();
    }

    pub fn add_profile(&mut self, new_profile: &Profile) {
        new_profile.create_dir_if_unexist();
        self.profiles.push(new_profile.clone());
        self.set_active_profile(new_profile.id.clone()).unwrap();
        self.write_file();
    }

    pub fn remove_profile(&mut self, profile_id: String) {
        if let Some(index) = self.profiles.iter().position(|x| x.id == profile_id) {
            let profile = &self.profiles[index];
            self.remove_profile_dir(profile);
            self.profiles.remove(index); // 削除はindex使うので最後
            self.write_file();
        }
    }

    pub fn set_active_profile(&mut self, profile_id: String) -> Result<()> {
        self.profiles
            .iter_mut()
            .for_each(|p| p.is_active = p.id == profile_id);
        let target_profile = self.get_active_profile();

        self.apply_mod_status(&target_profile)
            .context("Failed to apply mod status")?;
        self.mutate_state_mod_status(&target_profile)
            .context("Failed to mutate state mod status")?;

        self.write_file();
        Ok(())
    }

    pub fn get_active_profile(&self) -> Profile {
        self.profiles
            .iter()
            .find(|x| x.is_active)
            .cloned()
            .unwrap_or_else(|| {
                warn!("Active profile not found. Using default profile.");
                Profile::default()
            })
    }

    pub fn scan_mods(&self) -> Result<Vec<Mod>> {
        let game_mod_dir = self.get_game_mod_dir();
        let mod_data_dir = self.mod_data_path.clone();

        let existing_symlinks = list_symlinks(game_mod_dir).unwrap_or_else(|e| {
            warn!("Failed to list symlinks: {}", e);
            vec![]
        });

        let entries = std::fs::read_dir(mod_data_dir)?;
        let mut mods = entries
            .par_bridge()
            .filter_map(|entry| {
                let entry = entry.ok()?;
                let path = entry.path();
                let modinfo_path = get_modinfo_path(&path).ok()?;
                let info = ModInfo::from_path(&modinfo_path).ok()?;
                let local_version = open(path.display().to_string()).ok().and_then(|repo| {
                    let head = repo.head().ok()?;
                    let head_branch = head.name()?.split('/').last()?.to_string();
                    let last_commit = head.peel_to_commit().ok()?;
                    let last_commit_date =
                        DateTime::<Utc>::from_timestamp(last_commit.time().seconds(), 0)?;
                    Some(LocalVersion {
                        branch_name: head_branch,
                        last_commit_date: last_commit_date.to_string(),
                    })
                });
                let mod_dir_name = path.file_name()?;
                let is_installed = existing_symlinks
                    .iter()
                    .any(|p| p.file_name() == Some(mod_dir_name));
                Some(Mod {
                    info,
                    local_version,
                    is_installed,
                    local_path: path.display().to_string(),
                })
            })
            .collect::<Vec<_>>();
        mods.sort_unstable();
        Ok(mods)
    }

    pub fn mutate_state_mod_status(&mut self, profile: &Profile) -> Result<Vec<Mod>> {
        let mods = self.scan_mods().context("Failed to scan mods")?;
        let active_profile = profile.clone();
        debug!(
            "Refreshing mod status for profile: {:?}",
            active_profile.name
        );
        debug!("Found {} mods", mods.len());

        self.profiles.iter_mut().for_each(|p| {
            if p.id.eq(&active_profile.id) {
                p.mod_status.clone_from(&mods);
            }
        });
        debug!(
            "Mod status refreshed: {:?}",
            self.get_active_profile().mod_status.len()
        );
        self.write_file();
        Ok(mods)
    }

    pub fn get_game_mod_dir(&self) -> PathBuf {
        self.get_active_profile().profile_path.mods.clone()
    }
}

trait Config {
    fn write_file(&self) {}
    fn read_file(&mut self) -> Self;
}

impl Config for Settings {
    fn write_file(&self) {
        let config_root = get_app_data_dir();
        if !config_root.exists() {
            fs::create_dir_all(&config_root).unwrap();
        }
        let config_file = config_root.join(SETTINGS_FILENAME);
        let serialized = serde_yaml::to_string(self).unwrap();
        let mut file = fs::File::create(config_file).unwrap();
        file.write_all(serialized.as_bytes()).unwrap();
    }

    fn read_file(&mut self) -> Settings {
        let config_file = get_app_data_dir().join(SETTINGS_FILENAME);
        let input = fs::read_to_string(config_file).unwrap();
        serde_yaml::from_str(&input).unwrap_or_else(|_| {
            debug!("Error: Failed to read config file");
            self.clone()
        })
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

    pub fn refresh_and_save_mod_status(&self) -> Result<Vec<Mod>> {
        let mut settings = self.settings.lock().unwrap();
        let profile = settings.get_active_profile();
        settings.mutate_state_mod_status(&profile)
    }

    pub fn get_settings(&self) -> Option<Settings> {
        let settings = self.settings.lock().unwrap();
        Some(settings.clone())
    }

    pub fn get_game_mod_dir(&self) -> PathBuf {
        let settings = self.settings.lock().unwrap();
        settings.get_game_mod_dir()
    }
}

pub mod commands {
    use super::*;

    #[tauri::command]
    pub fn get_settings(state: tauri::State<'_, AppState>) -> Result<Settings, String> {
        let settings = state.settings.lock().unwrap();
        Ok(settings.clone())
    }

    #[tauri::command]
    pub fn add_profile(
        state: tauri::State<'_, AppState>,
        id: String,
        name: String,
        game_path: Option<String>,
    ) -> Result<Profile, String> {
        let mut settings = state.settings.lock().unwrap();

        let game_path = game_path.and_then(|path| {
            let path = path.trim().trim_matches('"');
            let game_path = PathBuf::from(path);
            match game_path.file_name().and_then(std::ffi::OsStr::to_str) {
                Some("cataclysm-tiles.exe" | "Cataclysm.app") => Some(game_path),
                _ => None,
            }
        });

        if game_path.is_none() && game_path.is_some() {
            return Err("Invalid game path".to_string());
        }

        let new_profile = Profile::new(id, name, game_path);
        settings.add_profile(&new_profile);
        settings.write_file();
        Ok(new_profile)
    }

    #[tauri::command]
    pub fn remove_profile(
        state: tauri::State<'_, AppState>,
        profile_id: String,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();
        let current = settings.get_active_profile();
        if current.id == profile_id {
            // switch to default profile
            settings.set_active_profile("default".to_string()).unwrap();
        }
        settings.remove_profile(profile_id);
        Ok(())
    }

    #[tauri::command]
    pub fn set_profile_active(
        state: tauri::State<'_, AppState>,
        profile_id: String,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();
        settings.set_active_profile(profile_id).map_err(|e| {
            debug!("Error: Failed to set active profile: {:?}", state);
            e.to_string()
        })
    }

    #[tauri::command]
    pub fn get_active_profile(state: tauri::State<'_, AppState>) -> Result<Profile, String> {
        let settings = state.settings.lock().unwrap();
        let res = settings.get_active_profile();
        Ok(res)
    }

    #[tauri::command]
    pub fn edit_profile(
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

    #[tauri::command]
    pub fn get_current_profile(state: tauri::State<'_, AppState>) -> Result<Profile, String> {
        let settings = state.settings.lock().unwrap();
        let res = settings.get_active_profile();
        Ok(res)
    }

    #[tauri::command]
    pub fn set_launcher_language(
        state: tauri::State<'_, AppState>,
        lang: String,
    ) -> Result<(), String> {
        let mut settings = state.settings.lock().unwrap();
        settings.set_language(&lang);
        settings.write_file();
        Ok(())
    }
}
