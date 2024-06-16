use crate::prelude::*;

use git2::{Branch, BranchType, Repository, Signature};

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

fn commit(repo: &Repository, message: &str) -> Result<(), String> {
    debug!("Committing changes to repository");
    let sig = Signature::now("Catalyzer", "Nothing").unwrap();
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
    let mut branches = Vec::new();

    let local_branches = repo.branches(Some(BranchType::Local)).unwrap();

    for branch in local_branches {
        let (branch, _) = branch.unwrap();
        let branch_name = branch.name().unwrap().unwrap();
        let branch_name = branch_name.split('/').last().unwrap();

        branches.push(branch_name.to_string());
    }
    debug!("Found branches: {:?}", branches);
    Ok(branches)
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

fn git_clone(url: &str, target_dir: &Path) -> Result<Repository, String> {
    debug!("Cloning repository from {} to {:?}", url, &target_dir);
    let repo = match Repository::clone(url, target_dir) {
        Ok(repo) => repo,
        Err(e) => return Err(format!("Failed to clone repository: {}", e)),
    };
    Ok(repo)
}

pub mod commands {
    use super::*;
    use crate::profile::AppState;

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

        let repo = git_clone(&url, &target_dir).map_err(|e| e.to_string())?;
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
