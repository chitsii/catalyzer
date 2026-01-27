pub mod atomic;
pub mod symlink;

use crate::prelude::*;
use std::{fs, io};

/// Remove all files in a directory, excluding files that match the exclude_pattern.
/// If exclude_pattern is None, all files will be removed including the directory itself.
pub fn remove_dir_all(path: impl AsRef<Path>, exclude_pattern: Option<&str>) -> io::Result<()> {
    if exclude_pattern.is_none() {
        fs::remove_dir_all(&path)?;
        return Ok(());
    }
    let mut skipped = 0;
    for entry in fs::read_dir(&path)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if let Some(exclude_pattern) = exclude_pattern {
            if entry.path().to_string_lossy().contains(exclude_pattern) {
                debug!("Skipping {:?}", entry.path());
                skipped += 1;
                continue;
            }
        }
        debug!("Removing {:?}", entry.path());
        if ty.is_dir() {
            fs::remove_dir_all(entry.path())?;
        } else {
            fs::remove_file(entry.path())?;
        }
    }
    if skipped < 0 {
        fs::remove_dir_all(&path)?;
    }
    Ok(())
}

/// Copy the directory recursively excluding files that match the exclude_pattern.
/// If exclude_pattern is None, all files will be copied.
pub fn copy_dir_all(
    src: impl AsRef<Path>,
    dst: impl AsRef<Path>,
    exclude_pattern: Option<&str>,
) -> io::Result<()> {
    fs::create_dir_all(&dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;

        if let Some(exclude_pattern) = exclude_pattern {
            if entry.path().to_string_lossy().contains(exclude_pattern) {
                continue;
            }
        }
        if ty.is_dir() {
            copy_dir_all(
                entry.path(),
                dst.as_ref().join(entry.file_name()),
                exclude_pattern,
            )?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

/// ディレクトリの合計サイズを計算（バイト単位）
/// サブディレクトリ内のファイルも再帰的にカウントする
pub fn calculate_dir_size<P: AsRef<Path>>(path: P) -> io::Result<u64> {
    use walkdir::WalkDir;

    let mut total_size = 0u64;

    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            total_size += entry.metadata()?.len();
        }
    }

    Ok(total_size)
}

pub fn get_modinfo_path(dir: &Path) -> Result<PathBuf, String> {
    let modinfo_path = dir.join("modinfo.json");
    if !modinfo_path.exists() {
        return Err(format!("not a mod directory: {:?}", dir).to_string());
    }
    Ok(modinfo_path)
}

pub fn is_mod_dir(path: &Path) -> bool {
    get_modinfo_path(path).is_ok()
}

pub fn get_shallowest_mod_dir(path: &Path) -> Option<PathBuf> {
    let entries = std::fs::read_dir(path).unwrap();
    for entry in entries {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.is_dir() {
            if is_mod_dir(&path) {
                return Some(path);
            } else {
                let res = get_shallowest_mod_dir(&path);
                if res.is_some() {
                    return res;
                }
            }
        } else if path
            .file_name()
            .unwrap()
            .eq_ignore_ascii_case("modinfo.json")
        {
            return Some(path.parent().unwrap().to_path_buf());
        }
    }
    None
}

pub mod commands {
    use super::symlink::*;
    use crate::prelude::*;
    use crate::profile::AppState;
    use std::process::Command;

    #[tauri::command]
    pub fn open_dir(target_dir: String) {
        #[cfg(target_os = "windows")]
        {
            Command::new("explorer")
                .args(["/select,", &target_dir]) // The comma after select is not a typo
                .spawn()
                .unwrap();
        }
        #[cfg(target_os = "macos")]
        {
            Command::new("open")
                // .args(["-R", &target_dir])
                .args([&target_dir])
                .spawn()
                .unwrap();
        }
        // #[cfg(target_os = "linux")]
        // {
        //     if path.contains(",") {
        //         // see https://gitlab.freedesktop.org/dbus/dbus/-/issues/76
        //         let new_path = match metadata(&path).unwrap().is_dir() {
        //             true => path,
        //             false => {
        //                 let mut path2 = PathBuf::from(path);
        //                 path2.pop();
        //                 path2.into_os_string().into_string().unwrap()
        //             }
        //         };
        //         Command::new("xdg-open").arg(&new_path).spawn().unwrap();
        //     } else {
        //         if let Ok(Fork::Child) = daemon(false, false) {
        //             Command::new("dbus-send")
        //                 .args([
        //                     "--session",
        //                     "--dest=org.freedesktop.FileManager1",
        //                     "--type=method_call",
        //                     "/org/freedesktop/FileManager1",
        //                     "org.freedesktop.FileManager1.ShowItems",
        //                     format!("array:string:\"file://{path}\"").as_str(),
        //                     "string:\"\"",
        //                 ])
        //                 .spawn()
        //                 .unwrap();
        //         }
        //     }
        // }
    }

    #[tauri::command]
    pub fn open_mod_data() {
        let mod_dir_path = crate::paths::moddata_dir();
        open_dir(mod_dir_path.to_str().unwrap().to_string());
    }

    /// 対象ディレクトリに同名のシンボリックリンクを作成する
    pub fn link_to_target_subdir(mod_data_path: &Path, target_dir: &Path) -> Result<()> {
        let mod_name = Path::new(&mod_data_path).file_name().unwrap();
        let target_path = target_dir.join(mod_name);

        // debug!(
        //     "Creating symlink from {:?} to {:?}",
        //     &mod_data_path, &target_path
        // );
        create_symbolic_link(Path::new(&mod_data_path), &target_path)?;
        Ok(())
    }

    /// 対象ディレクトリ内の同名のシンボリックリンクを削除する
    /// シンボリックリンクが存在しない場合は何もしない
    pub fn unlink_target_subdir(mod_data_path: &Path, target_dir: &Path) -> Result<()> {
        let mod_name = Path::new(&mod_data_path).file_name().unwrap();
        let symlink_path = target_dir.join(mod_name);

        // debug!("Removing symlink from {:?}", &symlink_path);
        match std::fs::remove_file(&symlink_path) {
            Ok(_) => debug!("Removed symlink at {}", symlink_path.display()),
            Err(e) => warn!("Could not remove symlink for: {}", e),
        }
        Ok(())
    }

    #[tauri::command]
    pub fn install_mod(
        state: tauri::State<'_, AppState>,
        mod_data_path: String,
    ) -> Result<(), String> {
        let target_dir = state.get_game_mod_dir();
        link_to_target_subdir(Path::new(&mod_data_path), &target_dir)
            .map_err(|e| format!("Failed to create symlink: {}", e))?;
        state.refresh_and_save_mod_status().unwrap();
        Ok(())
    }

    #[tauri::command]
    pub fn uninstall_mod(
        state: tauri::State<'_, AppState>,
        mod_data_path: String,
    ) -> Result<(), String> {
        unlink_target_subdir(Path::new(&mod_data_path), &state.get_game_mod_dir())
            .map_err(|e| format!("Failed to remove symlink: {}", e))?;
        state.refresh_and_save_mod_status().unwrap();
        Ok(())
    }

    #[tauri::command]
    pub fn install_all_mods(state: tauri::State<'_, AppState>) -> Result<(), String> {
        let setting = state.get_settings().unwrap();
        let profile = setting.get_active_profile();
        let mod_data_paths = profile.get_mod_local_paths();

        for mod_data_path in mod_data_paths {
            match link_to_target_subdir(Path::new(&mod_data_path), &state.get_game_mod_dir()) {
                Ok(_) => {}
                Err(e) => {
                    warn!("Mod install fail: {}", e);
                }
            }
        }
        state.refresh_and_save_mod_status().unwrap();
        Ok(())
    }

    #[tauri::command]
    pub fn uninstall_all_mods(state: tauri::State<'_, AppState>) -> Result<(), String> {
        let setting = state.get_settings().unwrap();
        let profile = setting.get_active_profile();
        let mod_data_paths = profile.get_mod_local_paths();

        for mod_data_path in mod_data_paths {
            let symlink_path = Path::new(&mod_data_path);
            match unlink_target_subdir(symlink_path, &state.get_game_mod_dir()) {
                Ok(_) => {}
                Err(e) => {
                    warn!("Mod uninstall fail: {}", e);
                }
            }
        }
        state.refresh_and_save_mod_status().unwrap();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_copy_dir_all_recursive() {
        let temp = TempDir::new().unwrap();
        let src = temp.path().join("src");
        let dst = temp.path().join("dst");

        // セットアップ: ネストしたディレクトリ構造を作成
        fs::create_dir_all(&src.join("subdir")).unwrap();
        fs::write(src.join("file.txt"), "test").unwrap();
        fs::write(src.join("subdir/nested.txt"), "nested").unwrap();

        // テスト対象: 再帰コピー
        copy_dir_all(&src, &dst, None).unwrap();

        // 検証
        assert!(dst.join("file.txt").exists());
        assert!(dst.join("subdir/nested.txt").exists());
        assert_eq!(fs::read_to_string(dst.join("file.txt")).unwrap(), "test");
        assert_eq!(
            fs::read_to_string(dst.join("subdir/nested.txt")).unwrap(),
            "nested"
        );
    }

    #[test]
    fn test_copy_dir_all_preserves_structure() {
        let temp = TempDir::new().unwrap();
        let src = temp.path().join("src");
        let dst = temp.path().join("dst");

        // セットアップ: 深いネスト構造
        fs::create_dir_all(&src.join("a/b/c")).unwrap();
        fs::write(src.join("a/b/c/deep.txt"), "deep content").unwrap();
        fs::write(src.join("a/shallow.txt"), "shallow").unwrap();

        // テスト対象
        copy_dir_all(&src, &dst, None).unwrap();

        // 検証: ディレクトリ構造が保持されている
        assert!(dst.join("a").is_dir());
        assert!(dst.join("a/b").is_dir());
        assert!(dst.join("a/b/c").is_dir());
        assert!(dst.join("a/b/c/deep.txt").exists());
        assert!(dst.join("a/shallow.txt").exists());
    }

    #[test]
    fn test_copy_dir_all_with_exclude_pattern() {
        let temp = TempDir::new().unwrap();
        let src = temp.path().join("src");
        let dst = temp.path().join("dst");

        // セットアップ
        fs::create_dir_all(&src).unwrap();
        fs::write(src.join("keep.txt"), "keep").unwrap();
        fs::write(src.join("exclude_me.txt"), "exclude").unwrap();
        fs::write(src.join("also_keep.md"), "also").unwrap();

        // テスト対象: exclude_patternを指定
        copy_dir_all(&src, &dst, Some("exclude")).unwrap();

        // 検証
        assert!(dst.join("keep.txt").exists());
        assert!(dst.join("also_keep.md").exists());
        assert!(!dst.join("exclude_me.txt").exists()); // 除外されている
    }

    #[test]
    fn test_calculate_dir_size() {
        let temp = TempDir::new().unwrap();
        fs::write(temp.path().join("file1.txt"), "12345").unwrap(); // 5 bytes
        fs::write(temp.path().join("file2.txt"), "123").unwrap(); // 3 bytes

        let size = calculate_dir_size(temp.path()).unwrap();
        assert_eq!(size, 8);
    }

    #[test]
    fn test_calculate_dir_size_with_subdirs() {
        let temp = TempDir::new().unwrap();
        fs::create_dir_all(temp.path().join("subdir")).unwrap();
        fs::write(temp.path().join("root.txt"), "1234").unwrap(); // 4 bytes
        fs::write(temp.path().join("subdir/nested.txt"), "12").unwrap(); // 2 bytes

        let size = calculate_dir_size(temp.path()).unwrap();
        assert_eq!(size, 6);
    }

    #[test]
    fn test_calculate_dir_size_empty() {
        let temp = TempDir::new().unwrap();

        let size = calculate_dir_size(temp.path()).unwrap();
        assert_eq!(size, 0);
    }

    #[test]
    fn test_copy_dir_all_empty_directory() {
        let temp = TempDir::new().unwrap();
        let src = temp.path().join("empty_src");
        let dst = temp.path().join("empty_dst");

        // セットアップ: 空のディレクトリ
        fs::create_dir_all(&src).unwrap();

        // テスト対象
        copy_dir_all(&src, &dst, None).unwrap();

        // 検証: 空のディレクトリがコピーされている
        assert!(dst.exists());
        assert!(dst.is_dir());
    }

    #[test]
    fn test_remove_dir_all_with_exclude() {
        let temp = TempDir::new().unwrap();
        let dir = temp.path().join("test_dir");

        // セットアップ
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("keep.txt"), "keep").unwrap();
        fs::write(dir.join("delete.txt"), "delete").unwrap();
        fs::write(dir.join("also_delete.md"), "also").unwrap();

        // テスト対象: keepパターンを除外
        remove_dir_all(&dir, Some("keep")).unwrap();

        // 検証
        assert!(dir.join("keep.txt").exists()); // 除外されて残っている
        assert!(!dir.join("delete.txt").exists()); // 削除された
        assert!(!dir.join("also_delete.md").exists()); // 削除された
    }
}
