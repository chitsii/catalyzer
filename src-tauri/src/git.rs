use crate::prelude::*;

use git2::{Branch, Direction, FetchOptions, Repository, Signature};
use std::collections::HashSet;

pub fn open(target_dir: String) -> Result<Repository, String> {
    debug!("Opening repository at {}", target_dir);
    match Repository::open(&target_dir) {
        Ok(repo) => Ok(repo),
        Err(e) => Err(format!("Failed to open repository: {}", e)),
    }
}

fn init(target_dir: String) -> Result<Repository, String> {
    debug!("Initializing repository at {}", target_dir);
    match Repository::init(&target_dir) {
        Ok(_) => {
            let repo = open(target_dir).unwrap();
            Ok(repo)
        }
        Err(e) => Err(format!("Failed to initialize repository: {}", e)),
    }
}

fn get_signature() -> Signature<'static> {
    Signature::now("Catalyzer", "Nothing").unwrap()
}

fn commit(repo: &Repository, message: &str) -> Result<(), String> {
    debug!("Committing changes to repository");
    let sig = get_signature();
    match repo.head() {
        Ok(data) => {
            let tree_id = {
                let mut index = repo.index().unwrap();
                index
                    .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
                    .unwrap();
                index.write_tree().unwrap()
            };
            let tree = repo.find_tree(tree_id).unwrap();
            let head = data.peel_to_commit().unwrap();
            repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&head])
                .unwrap();
            Ok(())
        }
        Err(_) => {
            debug!("No HEAD found, creating initial commit.");
            let tree_id = {
                let mut index = repo.index().unwrap();
                index
                    .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
                    .unwrap();
                index.write_tree().unwrap()
            };
            let tree = repo.find_tree(tree_id).unwrap();
            repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[])
                .unwrap();
            Ok(())
        }
    }
}

fn find_remote(repo: &Repository) -> Result<git2::Remote, String> {
    debug!("Finding remote 'origin' in repository");
    repo.find_remote("origin")
        .map_err(|e| format!("Failed to find remote 'origin': {}", e))
}

fn fetch(repo: &Repository, depth: Option<i32>) -> Result<(), String> {
    debug!("Fetching from remote 'origin'");
    let mut remote = find_remote(repo)?;

    let mut fo = FetchOptions::new();
    if let Some(depth) = depth {
        fo.depth(depth);
    }
    remote
        .fetch(&["refs/heads/*:refs/heads/*"], Some(&mut fo), None)
        .map_err(|e| format!("Failed to fetch from remote 'origin': {}", e))
}

fn reset_hard(repo: &Repository) -> Result<(), String> {
    debug!("Resetting repository to HEAD");
    let head = repo.head().unwrap();
    let head_commit = head.peel_to_commit().unwrap();
    let head_object = head_commit.as_object();
    repo.reset(head_object, git2::ResetType::Hard, None)
        .unwrap();
    Ok(())
}

pub fn list_branches(repo: &Repository) -> Result<Vec<String>, String> {
    debug!("Listing branches in repository");

    let mut branches = HashSet::new();

    repo.branches(None).unwrap().for_each(|branch| {
        let (branch, _) = branch.unwrap();
        let branch_name = branch.name().unwrap().unwrap();
        let branch_name = branch_name.split('/').last().unwrap();

        if branch_name == "HEAD" {
            return;
        }
        branches.insert(branch_name.to_string());
    });

    debug!("Found branches: {:?}", branches);
    let response = branches.into_iter().collect();
    Ok(response)
}

fn git_create_branch<'a>(
    repo: &'a Repository,
    branch_name: &'a str,
    base_branch: &'a str,
) -> Result<Branch<'a>, String> {
    debug!("Creating branch {} from {}", branch_name, base_branch);
    let base_branch = repo
        .find_branch(base_branch, git2::BranchType::Local)
        .unwrap();
    let base_branch = base_branch.into_reference();
    let base_commit = base_branch.peel_to_commit().unwrap();
    let new_branch = repo.branch(branch_name, &base_commit, false).unwrap();
    Ok(new_branch)
}

fn checkout(repo: &Repository, branch_name: &str, create_if_unexist: bool) -> Result<bool, String> {
    debug!("Checking out branch {}", branch_name);
    match repo.find_branch(branch_name, git2::BranchType::Local) {
        Ok(branch) => {
            let branch = branch.into_reference();
            repo.set_head(branch.name().unwrap()).unwrap();
            Ok(false)
        }
        Err(_e) => {
            debug!("Branch not found: {}", branch_name);
            if create_if_unexist {
                let head = repo.head().unwrap();
                let current_branch = head.name().unwrap().split('/').last().unwrap();
                let new_branch = git_create_branch(repo, branch_name, current_branch).unwrap();
                let new_branch_ref = new_branch.into_reference();
                repo.set_head(new_branch_ref.name().unwrap()).unwrap();
                debug!("move to the new branch: {}", branch_name);
                Ok(true)
            } else {
                Err("Did not find branch that name to checkout".to_string())
            }
        }
    }
}

pub fn try_checkout_to(
    target_dir: String,
    target_branch: String,
    create_if_unexist: bool,
) -> Result<(), String> {
    let repo = open(target_dir.clone())
        .map_err(|e| format!("Failed to open repository at {}: {}", target_dir, e))?;
    let _has_created = match checkout(&repo, &target_branch, create_if_unexist) {
        Ok(has_created) => has_created,
        Err(e) => return Err(e),
    };
    reset_hard(&repo).unwrap();
    Ok(())
}

fn git_clone(url: &str, target_dir: &Path, depth1: Option<bool>) -> Result<Repository, String> {
    debug!(
        "Clone repo from {} to {:?}. depth = {:?}",
        url,
        &target_dir,
        depth1.unwrap_or(false)
    );
    if depth1.unwrap_or(false) {
        let mut fetch_opts = FetchOptions::new();
        fetch_opts.depth(1);
        let mut builder = git2::build::RepoBuilder::new();
        builder.fetch_options(fetch_opts);
        let repo = match builder.clone(url, target_dir) {
            Ok(repo) => repo,
            Err(e) => return Err(format!("Failed to clone repository: {}", e)),
        };
        Ok(repo)
    } else {
        let repo = match Repository::clone(url, target_dir) {
            Ok(repo) => repo,
            Err(e) => return Err(format!("Failed to clone repository: {}", e)),
        };
        Ok(repo)
    }
}

/// ls-remote --tags --refs | awk '{print $2}' | awk -F'/' '{print $3}'
fn ls_remote_tags(repo: &Repository) -> Result<Vec<String>, git2::Error> {
    let mut remote = find_remote(repo)
        .map_err(|e| git2::Error::from_str(&format!("Failed to find remote: {}", e)))?;
    let connection = remote.connect_auth(Direction::Fetch, None, None)?;

    let refs = connection.list()?;
    let mut tags = HashSet::new();
    for head in refs.iter() {
        if head.name().starts_with("refs/tags/") {
            tags.insert(
                head.name()
                    .to_string()
                    .replace("refs/tags/", "")
                    .replace("^{}", ""),
            );
        }
    }
    Ok(tags.into_iter().collect())
}

pub mod commands {
    use super::*;
    use crate::profile::AppState;

    #[tauri::command]
    pub fn git_fetch_all_mods(state: tauri::State<'_, AppState>) -> Result<(), String> {
        let setting = state.get_settings().unwrap();
        let mod_data_dir = setting.get_mod_data_dir();

        debug!("Fetching all mods");
        for entry in std::fs::read_dir(mod_data_dir).unwrap() {
            debug!("Fetching mod: {:?}", entry);
            let entry = entry.unwrap();
            let path = entry.path();
            if path.is_dir() {
                if let Ok(repo) = open(path.to_str().unwrap().to_string()) {
                    match fetch(&repo, None) {
                        Ok(_) => {}
                        Err(e) => {
                            debug!("Failed to fetch origin: {}", e);
                        }
                    }
                }
            }
        }
        Ok(())
    }

    #[tauri::command]
    pub fn git_clone_mod_repo(
        state: tauri::State<'_, AppState>,
        url: String,
    ) -> Result<(), String> {
        let setting = state.get_settings().unwrap();
        let mod_data_dir = setting.get_mod_data_dir();

        let repo_name = url.split('/').last().unwrap();
        let repo_name = repo_name.replace(".git", "");
        let target_dir = mod_data_dir.join(repo_name);

        let repo = git_clone(&url, &target_dir, None).map_err(|e| e.to_string())?;
        let cloned_dir = repo.path().parent().unwrap(); // .gitの親フォルダ
        debug!("Repository cloned to {:?}", cloned_dir);

        let is_mod = crate::logic::utils::is_mod_dir(cloned_dir);
        if !is_mod {
            std::fs::remove_dir_all(cloned_dir).unwrap();
            return Err("Not a mod repository！".to_string());
        }
        Ok(())
    }

    #[tauri::command]
    /// Initialize a git repository at the target directory.
    pub fn git_init(state: tauri::State<'_, AppState>, target_dir: String) -> Result<(), String> {
        let target = std::path::Path::new(&target_dir);
        if !target.exists() {
            return Err(format!(
                "Target directory does not exist: {}",
                target.display()
            ));
        }
        if open(target_dir.clone()).is_ok() {
            return Err(format!("Repository already exists at {}", target_dir));
        }
        let repo = init(target_dir).unwrap();
        debug!("Repository initialized at {:?}", repo.path());
        commit(&repo, "Initial commit").unwrap();
        reset_hard(&repo).unwrap();

        state.refresh_and_save_mod_status().unwrap();
        Ok(())
    }

    /// Commit changes in the target directory. (If message is not provided, a default message will be used.)
    #[tauri::command]
    pub fn git_commit_changes(target_dir: String, message: Option<String>) -> Result<(), String> {
        let now = chrono::Local::now().to_string();
        let message = message.unwrap_or_else(|| format!("Changes committed at {}", now));

        let repo = match open(target_dir) {
            Ok(repo) => repo,
            Err(e) => return Err(e),
        };

        match commit(&repo, &message) {
            Ok(_) => Ok(()),
            Err(e) => Err(e),
        }
    }

    /// Reset changes in the target directory.
    #[tauri::command]
    pub fn git_reset_changes(target_dir: String) -> Result<(), String> {
        let repo = open(target_dir).unwrap();
        reset_hard(&repo).unwrap();
        Ok(())
    }

    /// List branches in the target directory.
    #[tauri::command]
    pub fn git_list_branches(target_dir: String) -> Result<Vec<String>, String> {
        let repo = open(target_dir).unwrap();
        match list_branches(&repo) {
            Ok(branches) => Ok(branches),
            Err(e) => Err(format!("Failed to list branches: {}", e)),
        }
    }

    /// Checkout a branch in the target directory.
    /// If the branch does not exist, it will:
    ///     create one if `create_if_unexist` is true.
    ///     return Err if`create_if_unexist` is false.
    #[tauri::command]
    pub fn git_checkout(
        state: tauri::State<'_, AppState>,
        target_dir: String,
        target_branch: String,
        create_if_unexist: bool,
    ) -> Result<(), String> {
        try_checkout_to(target_dir, target_branch, create_if_unexist)?;
        state.refresh_and_save_mod_status().unwrap();
        Ok(())
    }
}

pub mod cdda {
    use super::{fetch, get_signature, git_clone, ls_remote_tags};
    use crate::prelude::*;
    use crate::profile::get_app_data_dir;
    use git2::Repository;
    use regex::Regex;

    const BASE: &str = r#"CleverRaven/Cataclysm-DDA"#;
    const DATE_FORMAT: &str = r"(\d{4}-\d{2}-\d{2}-\d{4})";

    fn get_release_api_endpoint(tab_name: String) -> String {
        let url = format!(
            "https://api.github.com/repos/{}/releases/tags/{}",
            BASE, tab_name
        );
        url
    }

    fn get_clone_dir_path() -> PathBuf {
        let app_data_dir = get_app_data_dir();
        app_data_dir.join(".cdda").join("Cataclysm-DDA")
    }

    fn infer_release_browser_url(tag_name: String) -> String {
        let url = format!("https://github.com/{}/releases/tag/{}", BASE, tag_name);
        url
    }

    #[cfg(target_os = "macos")]
    fn infer_experimental_download_url(tag_name: String) -> String {
        let re = Regex::new(DATE_FORMAT).unwrap();
        let date = re.find(&tag_name).unwrap().as_str();
        let url = format!(
            "https://github.com/{}/releases/download/{}/cdda-osx-tiles-universal-{}.dmg",
            BASE, tag_name, date
        );
        url
    }
    #[cfg(target_os = "windows")]
    fn infer_experimental_download_url(tag_name: String) -> Sring {
        let re = Regex::new(DATE_FORMAT).unwrap();
        let date = re.find(&tag_name).unwrap().as_str();
        let url = format!(
            "https://github.com/{}/releases/download/{}/cdda-windows-tiles-sounds-x64-msvc-{}.zip",
            BASE, tag_name, date
        );
        url
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

    /// try to open the repository at the target directory, or clone it if not exist.
    fn get_cdda_repo() -> Result<Repository, String> {
        let target_dir = get_clone_dir_path();
        let repo = match Repository::open(&target_dir) {
            Ok(repo) => repo,
            Err(_) => {
                debug!("CDDA Repository not found. Will clone it.");
                return shallow_clone_cdda(target_dir);
            }
        };
        Ok(repo)
    }

    fn pull_rebase_cdda_repo(repo: &Repository) -> Result<(), String> {
        // fetch the latest changes
        fetch(repo, Some(1))?;

        // rebase the current branch to the latest changes
        let mut rebase = repo
            .rebase(None, None, None, None)
            .map_err(|e| format!("Failed to start rebase: {}", e))?;
        let app_signature = get_signature();
        while let Some(op) = rebase.next() {
            match op {
                Ok(_) => {
                    rebase
                        .commit(None, &app_signature, None)
                        .map_err(|e| format!("Failed to commit rebase operation: {}", e))?;
                }
                Err(e) => {
                    rebase.abort().map_err(|ae| {
                        format!("Failed to abort rebase: {}. Original error: {}", ae, e)
                    })?;
                    return Err(format!("Failed during rebase operation: {}", e));
                }
            }
        }
        rebase
            .finish(None)
            .map_err(|e| format!("Failed to finish rebase: {}", e))?;
        Ok(())
    }

    fn get_stable_release_tag(repo: &Repository, num: usize) -> Result<Vec<String>, git2::Error> {
        let tags = ls_remote_tags(repo)?;
        debug!("{:?}", tags);
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

    fn get_latest_release_tag(repo: &Repository, num: usize) -> Result<Vec<String>, git2::Error> {
        let tags = ls_remote_tags(repo)?;
        debug!("{:?}", tags);
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
            let target_dir = get_clone_dir_path();
            target_dir.exists()
        }

        #[derive(Debug, Deserialize, Serialize, Clone)]
        pub struct Res {
            pub tag_name: String,
            pub browser_url: String,
            pub download_url: String,
            // IDEA: add a field for download count
        }

        #[tauri::command]
        pub fn cdda_get_stable_releases(num: usize) -> Result<Vec<Res>, String> {
            info!("retrieve stable releases.");

            let repo = get_cdda_repo().unwrap();

            debug!("got repo");

            match get_stable_release_tag(&repo, num) {
                Ok(tags) => {
                    debug!("{:?}", tags);
                    let responses = tags
                        .iter()
                        .map(|tag| {
                            let browser_url = infer_release_browser_url(tag.to_string());
                            let download_url = get_stable_download_url(tag.to_string());
                            Res {
                                tag_name: tag.to_string(),
                                browser_url,
                                download_url: download_url.unwrap_or_default(),
                            }
                        })
                        .collect::<Vec<Res>>();
                    Ok(responses)
                }
                Err(e) => Err(format!("Failed to get stable release tags: {}", e)),
            }
        }

        #[tauri::command]
        pub fn cdda_get_latest_releases(num: usize) -> Result<Vec<Res>, String> {
            info!("retrieve latest releases.");

            let repo = get_cdda_repo().unwrap();

            match get_latest_release_tag(&repo, num) {
                Ok(tags) => {
                    debug!("{:?}", tags);
                    let responses = tags
                        .iter()
                        .map(|tag| {
                            let browser_url = infer_release_browser_url(tag.to_string());
                            let download_url = infer_experimental_download_url(tag.to_string());
                            Res {
                                tag_name: tag.to_string(),
                                browser_url,
                                download_url,
                            }
                        })
                        .collect::<Vec<Res>>();
                    Ok(responses)
                }
                Err(e) => Err(format!("Failed to get latest release tags: {}", e)),
            }

            // let tags = ls_remote_tags(&repo).unwrap();

            // let to_take = num.min(tags.len());
            // let tags = tags
            //     .iter()
            //     .take(to_take)
            //     .map(|tag| tag.to_string())
            //     .collect::<Vec<String>>();
            // let responses = tags
            //     .iter()
            //     .map(|tag| {
            //         println!("{}", tag);
            //         let browser_url = get_release_browser_url(tag.to_string());
            //         let download_url = infer_experimental_download_url(tag.to_string());
            //         Res {
            //             tag_name: tag.to_string(),
            //             browser_url,
            //             download_url,
            //         }
            //     })
            //     .collect::<Vec<Res>>();
            // Ok(responses)
        }

        #[tauri::command]
        pub fn cdda_pull_rebase() -> Result<(), String> {
            let repo = get_cdda_repo().unwrap();
            pull_rebase_cdda_repo(&repo)
        }
    }
}
