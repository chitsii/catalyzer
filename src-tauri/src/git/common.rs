use crate::prelude::*;
use git2::{Branch, Direction, FetchOptions, Repository, Signature};
use std::collections::HashSet;

pub fn open(target_dir: String) -> Result<Repository, String> {
    // debug!("Opening repository at {}", target_dir);
    Repository::open(target_dir).map_err(|e| format!("Failed to open repository: {}", e))
}

pub fn init(target_dir: String) -> Result<Repository, String> {
    debug!("Initializing repository at {}", target_dir);
    match Repository::init(&target_dir) {
        Ok(_) => open(target_dir),
        Err(e) => Err(format!("Failed to initialize repository: {}", e)),
    }
}
pub fn get_signature() -> Signature<'static> {
    Signature::now("Catalyzer", "Nothing").unwrap()
}

pub fn commit(repo: &Repository, message: &str) -> Result<(), String> {
    debug!("Committing changes to repository");
    let sig = get_signature();
    let tree_id = {
        let mut index = repo.index().unwrap();
        index
            .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
            .unwrap();
        index.write_tree().unwrap()
    };
    let tree = repo.find_tree(tree_id).unwrap();
    let parents = match repo.head() {
        Ok(head) => {
            let head = head.peel_to_commit().unwrap();
            vec![head]
        }
        Err(_) => vec![],
    };
    let p = &parents.iter().collect::<Vec<_>>();
    repo.commit(Some("HEAD"), &sig, &sig, message, &tree, p.as_slice())
        .unwrap();
    Ok(())
}

fn find_remote(repo: &Repository) -> Result<git2::Remote, String> {
    debug!("Finding remote 'origin' in repository");
    repo.find_remote("origin")
        .map_err(|e| format!("Failed to find remote 'origin': {}", e))
}

pub fn fetch(repo: &Repository, depth: Option<i32>) -> Result<(), String> {
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

pub fn pull_rebase(repo: &Repository) -> Result<(), String> {
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

pub fn reset_hard(repo: &Repository) -> Result<(), String> {
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

pub fn git_clone(url: &str, target_dir: &Path, depth1: Option<bool>) -> Result<Repository, String> {
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

fn get_tmp_dir_path() -> PathBuf {
    use crate::profile::constant_paths::get_app_data_dir;
    let app_data_dir = get_app_data_dir();
    let tmp_path = app_data_dir.join(".cdda").join("tmp");
    if !tmp_path.exists() {
        debug!("init tmp dir: {:?}", &tmp_path);
        std::fs::create_dir_all(&tmp_path).unwrap();
    }
    tmp_path
}

pub fn ls_remote_tags(url: String) -> Result<Vec<String>> {
    let tmp = get_tmp_dir_path();
    let repo = git2::Repository::init(tmp)?;
    let mut remote = repo.remote_anonymous(&url)?;
    let connection = remote
        .connect_auth(Direction::Fetch, None, None)
        .context("Failed to connect to remote repository. Please check your network connection.")?;
    let refs = connection.list()?;
    let mut tags = HashSet::new();
    refs.iter().for_each(|head| {
        if head.name().starts_with("refs/tags/") {
            tags.insert(
                head.name()
                    .to_string()
                    .replace("refs/tags/", "")
                    .replace("^{}", ""),
            );
        }
    });
    Ok(tags.into_iter().collect())
}

pub mod commands {
    use super::*;
    use crate::profile::AppState;

    #[tauri::command]
    pub fn git_fetch_all_mods() -> Result<(), String> {
        let mod_data_dir = crate::profile::constant_paths::moddata_dir();

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
    pub fn git_clone_mod_repo(url: String) -> Result<(), String> {
        let mod_data_dir = crate::profile::constant_paths::moddata_dir();

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
