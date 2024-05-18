use git2::{Branch, Repository, Signature};

pub fn git_open(target_dir: String) -> Result<Repository, String> {
    println!("Opening repository at {}", target_dir);
    match Repository::open(&target_dir) {
        Ok(repo) => Ok(repo),
        Err(e) => Err(format!("Failed to open repository: {}", e)),
    }
}

pub fn git_init(target_dir: String) -> Result<Repository, String> {
    println!("Initializing repository at {}", target_dir);
    match Repository::init(&target_dir) {
        Ok(_) => {
            let repo = git_open(target_dir).unwrap();
            Ok(repo)
        }
        Err(e) => Err(format!("Failed to initialize repository: {}", e)),
    }
}

pub fn git_commit(repo: &Repository, message: &str) -> Result<(), String> {
    println!("Committing changes to repository");

    let sig = Signature::now("CataclysmLauncher", "Nothing").unwrap();

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
            println!("No HEAD found, creating initial commit.");
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

            // let tree_id = repo.index().unwrap().write_tree().unwrap();
            // let tree = repo.find_tree(tree_id).unwrap();
            // repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[])
            //     .unwrap();
            // Ok(())
        }
    }
}

pub fn git_reset_hard(repo: &Repository) -> Result<(), String> {
    println!("Resetting repository to HEAD");
    let head = repo.head().unwrap();
    let head_commit = head.peel_to_commit().unwrap();
    let head_object = head_commit.as_object();
    repo.reset(head_object, git2::ResetType::Hard, None)
        .unwrap();
    Ok(())
}

pub fn git_list_branches(repo: &Repository) -> Result<Vec<String>, String> {
    println!("Listing branches in repository");
    let mut branches = Vec::new();
    for branch in repo.branches(None).unwrap() {
        let (branch, _) = branch.unwrap();
        let branch_name = branch.name().unwrap().unwrap();
        let branch_name = branch_name.split('/').last().unwrap();

        branches.push(branch_name.to_string());
    }
    Ok(branches)
}

fn git_create_branch<'a>(
    repo: &'a Repository,
    branch_name: &'a str,
    base_branch: &'a str,
) -> Result<Branch<'a>, String> {
    println!("Creating branch {} from {}", branch_name, base_branch);
    let base_branch = repo
        .find_branch(base_branch, git2::BranchType::Local)
        .unwrap();
    let base_branch = base_branch.into_reference();
    let base_commit = base_branch.peel_to_commit().unwrap();
    let new_branch = repo.branch(branch_name, &base_commit, false).unwrap();
    Ok(new_branch)
}

pub fn git_checkout(
    repo: &Repository,
    branch_name: &str,
    create_if_unexist: bool,
) -> Result<bool, String> {
    println!("Checking out branch {}", branch_name);

    match repo.find_branch(branch_name, git2::BranchType::Local) {
        Ok(branch) => {
            let branch = branch.into_reference();
            repo.set_head(branch.name().unwrap()).unwrap();
            Ok(false)
        }
        Err(_e) => {
            println!("Branch not found: {}", branch_name);
            if create_if_unexist {
                let head = repo.head().unwrap();
                let current_branch = head.name().unwrap().split('/').last().unwrap();
                let new_branch = git_create_branch(repo, branch_name, current_branch).unwrap();
                let new_branch_ref = new_branch.into_reference();
                repo.set_head(new_branch_ref.name().unwrap()).unwrap();
                println!("move to the new branch: {}", branch_name);
                Ok(true)
            } else {
                Err("Did not find branch that name to checkout".to_string())
            }
        }
    }
}

pub mod commands {
    use super::*;

    #[tauri::command]
    /// Initialize a git repository at the target directory.
    pub fn init(target_dir: String) -> Result<(), String> {
        let target = std::path::Path::new(&target_dir);
        if !target.exists() {
            return Err(format!(
                "Target directory does not exist: {}",
                target.display()
            ));
        }
        if git_open(target_dir.clone()).is_ok() {
            return Err(format!("Repository already exists at {}", target_dir));
        }
        let repo = git_init(target_dir).unwrap();
        println!("Repository initialized at {}", repo.path().display());
        git_commit(&repo, "Initial commit").unwrap();
        git_reset_hard(&repo).unwrap();
        Ok(())
    }

    /// Commit changes in the target directory. (If message is not provided, a default message will be used.)
    #[tauri::command]
    pub fn commit_changes(target_dir: String, message: Option<String>) -> Result<(), String> {
        let now = chrono::Local::now().to_string();
        let message = message.unwrap_or_else(|| format!("Changes committed at {}", now));

        let repo = match git_open(target_dir) {
            Ok(repo) => repo,
            Err(e) => return Err(e),
        };

        match git_commit(&repo, &message) {
            Ok(_) => Ok(()),
            Err(e) => Err(e),
        }
    }

    /// Reset changes in the target directory.
    #[tauri::command]
    pub fn reset_changes(target_dir: String) -> Result<(), String> {
        let repo = git_open(target_dir).unwrap();
        git_reset_hard(&repo).unwrap();
        Ok(())
    }

    /// List branches in the target directory.
    #[tauri::command]
    pub fn list_branches(target_dir: String) -> Result<Vec<String>, String> {
        let repo = git_open(target_dir).unwrap();
        match git_list_branches(&repo) {
            Ok(branches) => Ok(branches),
            Err(e) => Err(format!("Failed to list branches: {}", e)),
        }
    }

    /// Checkout a branch in the target directory.
    /// If the branch does not exist, it will:
    ///     create one if `create_if_unexist` is true.
    ///     return Err if`create_if_unexist` is false.
    #[tauri::command]
    pub fn checkout(
        target_dir: String,
        target_branch: String,
        create_if_unexist: bool,
    ) -> Result<(), String> {
        let repo = git_open(target_dir.clone()).unwrap();
        let _has_created = match git_checkout(&repo, &target_branch, create_if_unexist) {
            Ok(has_created) => has_created,
            Err(e) => return Err(e),
        };
        git_reset_hard(&repo).unwrap();

        Ok(())
    }
}
