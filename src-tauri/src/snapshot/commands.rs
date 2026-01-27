//! Tauriコマンド定義
//!
//! スナップショット操作をフロントエンドから呼び出すためのコマンド

use tauri::command;
use super::{create_snapshot, list_snapshots, delete_snapshot, restore_snapshot, SnapshotSummary};

/// スナップショットを作成する
///
/// # Arguments
/// * `name` - スナップショット名
/// * `description` - 説明（任意）
/// * `include_saves` - セーブデータを含めるか
#[command]
pub async fn cmd_create_snapshot(
    name: String,
    description: Option<String>,
    include_saves: bool,
) -> Result<SnapshotSummary, String> {
    create_snapshot(&name, description, include_saves)
        .map_err(|e| e.to_string())
}

/// スナップショット一覧を取得する
#[command]
pub async fn cmd_list_snapshots() -> Result<Vec<SnapshotSummary>, String> {
    list_snapshots().map_err(|e| e.to_string())
}

/// スナップショットを削除する
///
/// # Arguments
/// * `name` - 削除するスナップショット名
#[command]
pub async fn cmd_delete_snapshot(name: String) -> Result<(), String> {
    delete_snapshot(&name).map_err(|e| e.to_string())
}

/// スナップショットを復元する
///
/// # Arguments
/// * `name` - 復元するスナップショット名
#[command]
pub async fn cmd_restore_snapshot(name: String) -> Result<(), String> {
    restore_snapshot(&name).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_commands_exist() {
        // コマンド関数が存在することを確認（コンパイルテスト）
        let _ = cmd_create_snapshot;
        let _ = cmd_list_snapshots;
        let _ = cmd_delete_snapshot;
        let _ = cmd_restore_snapshot;
    }
}
