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
}

impl ModInfo {
    pub fn from_path(path: &std::path::Path) -> Result<Self, String> {
        println!("Reading modinfo from {}", path.display());
        let content = std::fs::read_to_string(path).unwrap();
        // println!("Content: {}", content);
        let info: Vec<ModInfo> = serde_json::from_str(&content).unwrap_or_else(|e| {
            println!(
                "Failed to parse modinfo.json of mod {}. msg: {}",
                &path.to_string_lossy(),
                e
            );
            Vec::new()
        });
        if info.len() != 1 {
            return Err("Invalid modinfo.json".to_string());
        }
        let elem = info.first().unwrap().clone();
        Ok(elem)
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocalVersion {
    pub branch_name: String,
    pub last_commit_date: String,
}

// #[derive(serde::Deserialize, serde::Serialize, Debug)]
#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Mod {
    pub info: ModInfo,
    pub local_version: Option<LocalVersion>,
    pub is_installed: bool,
    pub local_path: String,
}
