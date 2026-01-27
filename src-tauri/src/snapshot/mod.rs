//! スナップショット管理モジュール
//!
//! 環境スナップショットの作成・復元・削除を担当する。
//! git不要のシンプルなフォルダコピー方式を採用。

pub mod commands;

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

// ============================================================
// 構造体定義
// ============================================================

/// スナップショットの完全な情報を保持する構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    /// メタデータ
    pub meta: SnapshotMeta,
    /// スナップショットのルートディレクトリパス
    #[serde(skip_serializing)]
    pub root_path: PathBuf,
    /// 含まれるModの一覧
    pub mods: Vec<SnapshotModInfo>,
    /// 使用容量（バイト）
    pub size_bytes: u64,
}

/// スナップショットのメタデータ（meta.yamlに保存される内容）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct SnapshotMeta {
    /// スナップショット名（ディレクトリ名としても使用）
    pub name: String,
    /// 作成日時（ISO 8601形式文字列）
    pub created_at: String,
    /// ゲームバージョンID（例: "cdda-0.I-2026-01-20-1811"）
    pub game_version_id: String,
    /// プラットフォーム
    pub platform: Platform,
    /// 説明（任意）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// スキーマバージョン（将来の互換性のため）
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,
}

fn default_schema_version() -> u32 {
    1
}

/// スナップショットに含まれるModの簡易情報
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotModInfo {
    /// Mod識別子（identまたはid）
    pub id: String,
    /// 表示名
    pub name: String,
    /// バージョン（任意）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    /// Modディレクトリの相対パス（mods/配下）
    pub relative_path: String,
}

/// プラットフォーム列挙型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Windows,
    MacOS,
    Linux,
}

impl Platform {
    /// 現在のプラットフォームを検出
    pub fn current() -> Self {
        #[cfg(target_os = "windows")]
        {
            Platform::Windows
        }
        #[cfg(target_os = "macos")]
        {
            Platform::MacOS
        }
        #[cfg(target_os = "linux")]
        {
            Platform::Linux
        }
    }
}

/// スナップショット一覧表示用の軽量構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotSummary {
    /// スナップショット名
    pub name: String,
    /// 作成日時（ISO 8601形式文字列）
    pub created_at: String,
    /// ゲームバージョンID
    pub game_version_id: String,
    /// プラットフォーム
    pub platform: Platform,
    /// 説明（任意）
    pub description: Option<String>,
    /// Mod数
    pub mod_count: usize,
    /// 使用容量（バイト）
    pub size_bytes: u64,
}

impl From<&Snapshot> for SnapshotSummary {
    fn from(snapshot: &Snapshot) -> Self {
        Self {
            name: snapshot.meta.name.clone(),
            created_at: snapshot.meta.created_at.clone(),
            game_version_id: snapshot.meta.game_version_id.clone(),
            platform: snapshot.meta.platform,
            description: snapshot.meta.description.clone(),
            mod_count: snapshot.mods.len(),
            size_bytes: snapshot.size_bytes,
        }
    }
}

// ============================================================
// スナップショットコンテキスト（内部状態管理）
// ============================================================

/// スナップショット管理用の内部状態
struct SnapshotContext {
    /// スナップショット保存ディレクトリ
    snapshots_dir: PathBuf,
    /// 存在するスナップショット名のセット
    existing_snapshots: HashSet<String>,
    /// 現在アクティブなスナップショット名
    active_snapshot: Option<String>,
}

impl SnapshotContext {
    fn new(snapshots_dir: PathBuf) -> Self {
        // ディレクトリがなければ作成
        if !snapshots_dir.exists() {
            let _ = fs::create_dir_all(&snapshots_dir);
        }
        Self {
            snapshots_dir,
            existing_snapshots: HashSet::new(),
            active_snapshot: None,
        }
    }

    fn get_snapshot_dir(&self, name: &str) -> PathBuf {
        self.snapshots_dir.join(name)
    }

    fn snapshot_exists(&self, name: &str) -> bool {
        self.existing_snapshots.contains(name) || self.get_snapshot_dir(name).exists()
    }

    fn add_snapshot(&mut self, name: &str) {
        self.existing_snapshots.insert(name.to_string());
    }

    fn remove_snapshot(&mut self, name: &str) {
        self.existing_snapshots.remove(name);
        if self.active_snapshot.as_deref() == Some(name) {
            self.active_snapshot = None;
        }
    }

    fn set_active(&mut self, name: &str) {
        self.active_snapshot = Some(name.to_string());
    }

    fn is_active(&self, name: &str) -> bool {
        self.active_snapshot.as_deref() == Some(name)
    }
}

/// グローバルなスナップショットコンテキスト
static CONTEXT: Mutex<Option<SnapshotContext>> = Mutex::new(None);

/// コンテキストを初期化する（テスト用）
#[cfg(test)]
fn init_context(snapshots_dir: &Path) {
    let mut ctx = CONTEXT.lock().unwrap();
    *ctx = Some(SnapshotContext::new(snapshots_dir.to_path_buf()));
}

/// コンテキストを取得する（なければデフォルトディレクトリで初期化）
fn get_context() -> std::sync::MutexGuard<'static, Option<SnapshotContext>> {
    let mut ctx = CONTEXT.lock().unwrap();
    if ctx.is_none() {
        // デフォルトはアプリデータディレクトリ
        let default_dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("catalyzer")
            .join("snapshots");
        *ctx = Some(SnapshotContext::new(default_dir));
    }
    ctx
}

// ============================================================
// スナップショット操作
// ============================================================

/// スナップショットを作成する
///
/// # Arguments
/// * `name` - スナップショット名
/// * `description` - 説明（任意）
/// * `include_saves` - セーブデータを含めるか
///
/// # Returns
/// 作成されたスナップショットのサマリー
pub fn create_snapshot(
    name: &str,
    description: Option<String>,
    _include_saves: bool,
) -> Result<SnapshotSummary, SnapshotError> {
    let mut ctx_guard = get_context();
    let ctx = ctx_guard.as_mut().ok_or_else(|| {
        SnapshotError::Internal("コンテキストが初期化されていません".to_string())
    })?;

    // 名前のバリデーション
    if name.is_empty() {
        return Err(SnapshotError::InvalidName(name.to_string()));
    }

    // 重複チェック
    if ctx.snapshot_exists(name) {
        return Err(SnapshotError::AlreadyExists(name.to_string()));
    }

    // スナップショットディレクトリを作成
    let snapshot_dir = ctx.get_snapshot_dir(name);
    fs::create_dir_all(&snapshot_dir).map_err(|e| SnapshotError::IoError(e.to_string()))?;

    // 現在時刻を取得
    let now = chrono::Utc::now().to_rfc3339();

    // メタデータを作成
    let meta = SnapshotMeta {
        name: name.to_string(),
        created_at: now,
        game_version_id: "cdda-0.I-2026-01-20-1811".to_string(), // TODO: 実際のゲームバージョンを取得
        platform: Platform::current(),
        description,
        schema_version: 1,
    };

    // meta.yamlを保存
    let meta_path = snapshot_dir.join("meta.yaml");
    let meta_yaml = serde_yaml::to_string(&meta).map_err(|e| SnapshotError::Internal(e.to_string()))?;
    fs::write(&meta_path, meta_yaml).map_err(|e| SnapshotError::IoError(e.to_string()))?;

    // 状態を更新
    ctx.add_snapshot(name);

    // サマリーを返す
    Ok(SnapshotSummary {
        name: meta.name,
        created_at: meta.created_at,
        game_version_id: meta.game_version_id,
        platform: meta.platform,
        description: meta.description,
        mod_count: 0,
        size_bytes: 0,
    })
}

/// スナップショットを復元する
///
/// # Arguments
/// * `name` - 復元するスナップショット名
pub fn restore_snapshot(name: &str) -> Result<(), SnapshotError> {
    let mut ctx_guard = get_context();
    let ctx = ctx_guard.as_mut().ok_or_else(|| {
        SnapshotError::Internal("コンテキストが初期化されていません".to_string())
    })?;

    // 存在チェック
    if !ctx.snapshot_exists(name) {
        return Err(SnapshotError::NotFound(name.to_string()));
    }

    // スナップショットディレクトリの存在確認
    let snapshot_dir = ctx.get_snapshot_dir(name);
    if !snapshot_dir.exists() {
        return Err(SnapshotError::NotFound(name.to_string()));
    }

    // TODO: 実際の復元処理（ファイルコピー等）

    // アクティブに設定
    ctx.set_active(name);

    Ok(())
}

/// スナップショットを削除する
///
/// # Arguments
/// * `name` - 削除するスナップショット名
pub fn delete_snapshot(name: &str) -> Result<(), SnapshotError> {
    let mut ctx_guard = get_context();
    let ctx = ctx_guard.as_mut().ok_or_else(|| {
        SnapshotError::Internal("コンテキストが初期化されていません".to_string())
    })?;

    // 存在チェック
    if !ctx.snapshot_exists(name) {
        return Err(SnapshotError::NotFound(name.to_string()));
    }

    // アクティブチェック
    if ctx.is_active(name) {
        return Err(SnapshotError::CannotDeleteActive(name.to_string()));
    }

    // ディレクトリを削除
    let snapshot_dir = ctx.get_snapshot_dir(name);
    if snapshot_dir.exists() {
        fs::remove_dir_all(&snapshot_dir).map_err(|e| SnapshotError::IoError(e.to_string()))?;
    }

    // 状態を更新
    ctx.remove_snapshot(name);

    Ok(())
}

/// スナップショット一覧を取得する
pub fn list_snapshots() -> Result<Vec<SnapshotSummary>, SnapshotError> {
    let ctx_guard = get_context();
    let ctx = ctx_guard.as_ref().ok_or_else(|| {
        SnapshotError::Internal("コンテキストが初期化されていません".to_string())
    })?;

    let mut summaries = Vec::new();

    // スナップショットディレクトリをスキャン
    if ctx.snapshots_dir.exists() {
        let entries = fs::read_dir(&ctx.snapshots_dir)
            .map_err(|e| SnapshotError::IoError(e.to_string()))?;

        for entry in entries {
            let entry = entry.map_err(|e| SnapshotError::IoError(e.to_string()))?;
            let path = entry.path();

            if path.is_dir() {
                let meta_path = path.join("meta.yaml");
                if meta_path.exists() {
                    let meta_content = fs::read_to_string(&meta_path)
                        .map_err(|e| SnapshotError::IoError(e.to_string()))?;
                    let meta: SnapshotMeta = serde_yaml::from_str(&meta_content)
                        .map_err(|e| SnapshotError::Internal(e.to_string()))?;

                    summaries.push(SnapshotSummary {
                        name: meta.name,
                        created_at: meta.created_at,
                        game_version_id: meta.game_version_id,
                        platform: meta.platform,
                        description: meta.description,
                        mod_count: 0, // TODO: 実際のMod数を計算
                        size_bytes: 0, // TODO: 実際のサイズを計算
                    });
                }
            }
        }
    }

    Ok(summaries)
}

// ============================================================
// エラー型
// ============================================================

/// スナップショット操作のエラー型
#[derive(Debug, Clone)]
pub enum SnapshotError {
    /// スナップショットが既に存在する
    AlreadyExists(String),
    /// スナップショットが見つからない
    NotFound(String),
    /// 無効なスナップショット名
    InvalidName(String),
    /// I/Oエラー
    IoError(String),
    /// 容量不足
    InsufficientSpace { required: u64, available: u64 },
    /// アクティブなスナップショットは削除できない
    CannotDeleteActive(String),
    /// 内部エラー
    Internal(String),
}

impl std::fmt::Display for SnapshotError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::AlreadyExists(name) => write!(f, "スナップショット '{}' は既に存在します", name),
            Self::NotFound(name) => write!(f, "スナップショット '{}' が見つかりません", name),
            Self::InvalidName(name) => write!(f, "無効なスナップショット名: {}", name),
            Self::IoError(msg) => write!(f, "I/Oエラー: {}", msg),
            Self::InsufficientSpace { required, available } => {
                write!(
                    f,
                    "容量不足: 必要 {} バイト、空き {} バイト",
                    required, available
                )
            }
            Self::CannotDeleteActive(name) => {
                write!(f, "アクティブなスナップショット '{}' は削除できません", name)
            }
            Self::Internal(msg) => write!(f, "内部エラー: {}", msg),
        }
    }
}

impl std::error::Error for SnapshotError {}

// ============================================================
// テストモジュール
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    /// テスト用のスナップショット環境を設定
    fn setup_test_env() -> TempDir {
        let temp = TempDir::new().expect("一時ディレクトリの作成に失敗");
        init_context(temp.path());
        temp
    }

    // ----------------------------------------------------------
    // create_snapshot テスト
    // ----------------------------------------------------------

    #[test]
    fn test_create_snapshot_basic() {
        let _temp = setup_test_env();

        // 基本的なスナップショット作成
        let result = create_snapshot("TestSnapshot", None, false);

        assert!(result.is_ok(), "スナップショット作成に失敗: {:?}", result);
        let summary = result.unwrap();
        assert_eq!(summary.name, "TestSnapshot");
        assert_eq!(summary.mod_count, 0);
    }

    #[test]
    fn test_create_snapshot_with_saves() {
        let _temp = setup_test_env();

        // セーブデータを含むスナップショット作成
        let result = create_snapshot("WithSaves", Some("セーブ付き".to_string()), true);

        assert!(result.is_ok(), "セーブ付きスナップショット作成に失敗: {:?}", result);
        let summary = result.unwrap();
        assert_eq!(summary.description, Some("セーブ付き".to_string()));
    }

    #[test]
    fn test_create_snapshot_duplicate_name() {
        let _temp = setup_test_env();

        // 1つ目は成功
        let result1 = create_snapshot("Duplicate", None, false);
        assert!(result1.is_ok(), "1つ目のスナップショット作成に失敗");

        // 同名は失敗
        let result2 = create_snapshot("Duplicate", None, false);
        assert!(result2.is_err(), "重複名でエラーになるべき");
        match result2 {
            Err(SnapshotError::AlreadyExists(name)) => {
                assert_eq!(name, "Duplicate");
            }
            other => panic!("AlreadyExistsエラーが期待されるが、{:?}を受け取った", other),
        }
    }

    // ----------------------------------------------------------
    // restore_snapshot テスト
    // ----------------------------------------------------------

    #[test]
    fn test_restore_snapshot_basic() {
        let _temp = setup_test_env();

        // スナップショットを作成して復元
        let create_result = create_snapshot("ToRestore", None, false);
        assert!(create_result.is_ok(), "スナップショット作成に失敗");

        let result = restore_snapshot("ToRestore");
        assert!(result.is_ok(), "スナップショット復元に失敗: {:?}", result);
    }

    #[test]
    fn test_restore_snapshot_nonexistent() {
        let _temp = setup_test_env();

        // 存在しないスナップショットを復元しようとするとエラー
        let result = restore_snapshot("NonExistent");

        assert!(result.is_err(), "存在しないスナップショットでエラーになるべき");
        match result {
            Err(SnapshotError::NotFound(name)) => {
                assert_eq!(name, "NonExistent");
            }
            other => panic!("NotFoundエラーが期待されるが、{:?}を受け取った", other),
        }
    }

    // ----------------------------------------------------------
    // delete_snapshot テスト
    // ----------------------------------------------------------

    #[test]
    fn test_delete_snapshot() {
        let _temp = setup_test_env();

        // スナップショットを作成して削除
        let create_result = create_snapshot("ToDelete", None, false);
        assert!(create_result.is_ok(), "スナップショット作成に失敗");

        let result = delete_snapshot("ToDelete");
        assert!(result.is_ok(), "スナップショット削除に失敗: {:?}", result);

        // 削除後は見つからない
        let restore_result = restore_snapshot("ToDelete");
        assert!(restore_result.is_err(), "削除後は復元できないはず");
    }

    #[test]
    fn test_delete_active_snapshot() {
        let _temp = setup_test_env();

        // スナップショットを作成
        let create_result = create_snapshot("ActiveSnapshot", None, false);
        assert!(create_result.is_ok(), "スナップショット作成に失敗");

        // 復元してアクティブにする
        let restore_result = restore_snapshot("ActiveSnapshot");
        assert!(restore_result.is_ok(), "復元に失敗");

        // アクティブなスナップショットは削除できない
        let result = delete_snapshot("ActiveSnapshot");
        assert!(result.is_err(), "アクティブなスナップショットの削除はエラーになるべき");
        match result {
            Err(SnapshotError::CannotDeleteActive(name)) => {
                assert_eq!(name, "ActiveSnapshot");
            }
            other => panic!("CannotDeleteActiveエラーが期待されるが、{:?}を受け取った", other),
        }
    }
}
