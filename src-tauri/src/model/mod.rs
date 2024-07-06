use crate::prelude::*;

#[derive(serde::Deserialize, serde::Serialize, Debug, Clone)]
#[serde(untagged)]
pub enum StringOrVec {
    String(String),
    Vec(Vec<String>),
}

#[derive(serde::Deserialize, serde::Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModInfo {
    ident: Option<String>,
    id: Option<String>,
    name: String,
    authors: Option<StringOrVec>,
    description: Option<String>,
    category: Option<String>,
    dependencies: Option<StringOrVec>,
    maintainers: Option<StringOrVec>,
    version: Option<String>,
    obsolete: Option<bool>,
}

impl ModInfo {
    pub fn from_path(path: &std::path::Path) -> Result<Self, String> {
        // debug!("Reading modinfo from {}", path.display());
        let content = std::fs::read_to_string(path).unwrap();

        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        if v.is_array() && !v.as_array().unwrap().is_empty() {
            let v_array = v.as_array().unwrap();
            let mod_info = v_array.first().unwrap();
            let info: ModInfo = match serde_json::from_value(mod_info.clone()) {
                Ok(info) => info,
                Err(e) => {
                    debug!(
                        "Failed to parse modinfo.json of mod {}. msg: {}",
                        &path.to_string_lossy(),
                        e
                    );
                    return Err("Failed to parse modinfo.json".to_string());
                }
            };
            Ok(info)
        } else {
            Err("Failed to parse modinfo.json".to_string())
        }
    }

    pub fn get_id(&self) -> Option<String> {
        self.ident.clone().or(self.id.clone()).or(None)
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocalVersion {
    pub branch_name: String,
    pub last_commit_date: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Mod {
    pub info: ModInfo,
    pub local_version: Option<LocalVersion>,
    pub is_installed: bool,
    pub local_path: String,
}
impl PartialEq for Mod {
    fn eq(&self, other: &Self) -> bool {
        self.info.name == other.info.name
    }
}
impl PartialOrd for Mod {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}
impl Eq for Mod {}
impl Ord for Mod {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.info.name.cmp(&other.info.name)
    }
}
