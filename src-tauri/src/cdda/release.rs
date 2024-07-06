use crate::git::{git_clone, ls_remote_tags, pull_rebase};
use crate::prelude::*;
use git2::Repository;
use regex::Regex;

const BASE: &str = r#"CleverRaven/Cataclysm-DDA"#;
const DATE_FORMAT: &str = r"(\d{4}-\d{2}-\d{2}-\d{4})";

fn ls_cdda_tags() -> Result<Vec<String>, String> {
    let url = format!("https://github.com/{}.git", BASE);
    let tags = ls_remote_tags(url).map_err(|e| e.to_string())?;
    Ok(tags)
}

fn get_release_api_endpoint(tab_name: String) -> String {
    let url = format!(
        "https://api.github.com/repos/{}/releases/tags/{}",
        BASE, tab_name
    );
    url
}

fn infer_release_browser_url(tag_name: String) -> String {
    let url = format!("https://github.com/{}/releases/tag/{}", BASE, tag_name);
    url
}

fn infer_experimental_download_url(tag_name: String) -> String {
    #[cfg(target_os = "macos")]
    {
        let re = Regex::new(DATE_FORMAT).unwrap();
        let date = re.find(&tag_name).unwrap().as_str();
        let url = format!(
            "https://github.com/{}/releases/download/{}/cdda-osx-tiles-universal-{}.dmg",
            BASE, tag_name, date
        );
        url
    }
    #[cfg(target_os = "windows")]
    {
        let re = Regex::new(DATE_FORMAT).unwrap();
        let date = re.find(&tag_name).unwrap().as_str();
        let url = format!(
            "https://github.com/{}/releases/download/{}/cdda-windows-tiles-sounds-x64-msvc-{}.zip",
            BASE, tag_name, date
        );
        url
    }
}

fn github_api_client() -> reqwest::blocking::Client {
    use reqwest::header::HeaderMap;
    let mut headers = HeaderMap::new();
    headers.insert("X-GitHub-Api-Version", "2022-11-28".parse().unwrap());
    headers.insert("Accept", "application/vnd.github+json".parse().unwrap());
    headers.insert("User-Agent", "catalyzer".parse().unwrap());
    reqwest::blocking::Client::builder()
        .default_headers(headers)
        .build()
        .unwrap()
}
fn platform_release_filter() -> String {
    #[cfg(target_os = "windows")]
    {
        r#"windows-tiles-sounds-x64|Windows_x64"#.to_string()
    }
    #[cfg(target_os = "macos")]
    {
        r#"osx-tiles|OSX-Tiles"#.to_string()
    }
    #[cfg(target_os = "linux")]
    {
        panic!("not supported yet for linux.")
    }
}

fn get_stable_download_url(tag_name: String) -> Option<String> {
    let endpoint = get_release_api_endpoint(tag_name.clone());
    debug!("Getting release info from {}", endpoint);
    let client = github_api_client();
    let response = client.get(&endpoint).send().unwrap();

    debug!("Response: {:?}", response);
    let json: serde_json::Value = match &response.status() {
        &reqwest::StatusCode::OK => response.json().unwrap(),
        _ => {
            warn!("Failed to get release info from {}", endpoint);
            return None;
        }
    };
    let assets = json["assets"].as_array().unwrap();
    let platform_filter = platform_release_filter();
    let re = Regex::new(&platform_filter).unwrap();
    let filtered = assets
        .iter()
        .filter(|asset| re.is_match(asset["name"].as_str().unwrap()))
        .collect::<Vec<_>>();

    if filtered.is_empty() {
        warn!(
            "No asset found for platform filter: {:?}, tag_name: {:?}",
            platform_filter, tag_name
        );
        return None;
    }
    let asset = filtered.first().unwrap();
    let download_url: Option<&str> = asset["browser_download_url"].as_str();
    match download_url {
        Some(url) => Some(url.to_string()),
        None => {
            warn!(
                "Failed to get download url from release info.
                    * asset: {:?},
                    * filter used: {:?}",
                asset, platform_filter
            );
            None
        }
    }
}

fn shallow_clone_cdda(target_dir: PathBuf) -> Result<Repository, String> {
    let url = format!("https://github.com/{}.git", BASE);
    let repo = match git_clone(&url, &target_dir, Some(true)) {
        Ok(repo) => repo,
        Err(e) => {
            return Err(format!("Failed to clone repository: {}", e));
        }
    };
    debug!("CDDA Repository cloned with depth=1.");
    Ok(repo)
}

/// Attempts to open the CDDA repository at the configured clone directory path.
/// If the repository is not found, it will attempt to clone the repository from the
/// configured base URL.
///
/// Returns the opened or cloned repository, or an error message if the operation fails.
fn get_cdda_repo() -> Result<Repository, String> {
    let target_dir = crate::paths::cdda_clone_dir();
    let repo = match Repository::open(&target_dir) {
        Ok(repo) => repo,
        Err(_) => {
            debug!("CDDA Repository not found. Will clone it.");
            return shallow_clone_cdda(target_dir);
        }
    };
    Ok(repo)
}

fn get_stable_release_tag(
    // repo: &Repository,
    num: usize,
) -> Result<Vec<String>, git2::Error> {
    let tags = ls_cdda_tags().unwrap_or_else(|_| vec![]); // ls_remote_tags(repo)?;
    let re = Regex::new(r"^0\.[A-Z]-?[0-9]?$").unwrap();
    let mut tags = tags
        .iter()
        .filter(|tag| re.is_match(tag))
        .map(|tag| tag.to_string())
        .collect::<Vec<String>>();
    tags.sort_unstable();
    tags.reverse();
    tags.truncate(num);
    Ok(tags)
}

fn get_latest_release_tag(
    // repo: &Repository,
    num: usize,
) -> Result<Vec<String>, git2::Error> {
    let tags = ls_cdda_tags().unwrap_or_else(|_| vec![]); // ls_remote_tags(repo)?;
    let re = Regex::new(DATE_FORMAT).unwrap();
    let mut tags = tags
        .iter()
        .filter(|tag| re.is_match(tag))
        .map(|tag| tag.to_string())
        .collect::<Vec<String>>();
    tags.sort_unstable();
    tags.reverse();
    tags.truncate(num);
    Ok(tags)
}

pub mod commands {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[tauri::command]
    pub fn github_rate_limit() -> Result<u64, String> {
        let url = "https://api.github.com/rate_limit";
        let client = github_api_client();
        let response = client.get(url).send().unwrap();

        if !response.status().is_success() {
            return Err("Failed to get rate limit.".to_string());
        }
        let json: serde_json::Value = response.json().unwrap();
        debug!("{:?}", json);
        let remain = json["rate"]["remaining"].as_u64().unwrap();
        Ok(remain)
    }

    #[tauri::command]
    pub fn cdda_is_cloned() -> bool {
        crate::paths::cdda_clone_dir().exists()
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    /// Represents information about a release of the CDDA project.
    ///
    /// This struct contains the tag name, browser URL, and download URL for a release.
    pub struct ReleaseInfo {
        pub tag_name: String,
        pub browser_url: String,
        pub download_url: String,
        // IDEA: add a field for download count
    }

    #[tauri::command]
    pub fn cdda_get_stable_releases(num: usize) -> Result<Vec<ReleaseInfo>, String> {
        info!("retrieve stable releases.");

        // let repo = get_cdda_repo().unwrap();

        debug!("got repo");

        match get_stable_release_tag(num) {
            Ok(tags) => {
                debug!("{:?}", tags);
                let responses = tags
                    .iter()
                    .map(|tag| {
                        let browser_url = infer_release_browser_url(tag.to_string());
                        let download_url = get_stable_download_url(tag.to_string());
                        ReleaseInfo {
                            tag_name: tag.to_string(),
                            browser_url,
                            download_url: download_url.unwrap_or_default(),
                        }
                    })
                    .collect::<Vec<ReleaseInfo>>();
                Ok(responses)
            }
            Err(e) => Err(format!("Failed to get stable release tags: {}", e)),
        }
    }

    #[tauri::command]
    pub fn cdda_get_latest_releases(num: usize) -> Result<Vec<ReleaseInfo>, String> {
        info!("retrieve latest releases.");

        match get_latest_release_tag(num) {
            Ok(tags) => {
                debug!("{:?}", tags);
                let responses = tags
                    .iter()
                    .map(|tag| {
                        let browser_url = infer_release_browser_url(tag.to_string());
                        let download_url = infer_experimental_download_url(tag.to_string());
                        ReleaseInfo {
                            tag_name: tag.to_string(),
                            browser_url,
                            download_url,
                        }
                    })
                    .collect::<Vec<ReleaseInfo>>();
                Ok(responses)
            }
            Err(e) => Err(format!("Failed to get latest release tags: {}", e)),
        }
    }

    #[tauri::command]
    pub fn cdda_pull_rebase() -> Result<(), String> {
        let repo = get_cdda_repo().unwrap();
        pull_rebase(&repo)
    }
}
