# 領域C: スナップショット実装設計

> **作成日**: 2026-01-27
> **担当**: 足軽3号（シニアソフトウェアエンジニア）
> **ステータス**: Draft
> **参照**: DATA_STRUCTURE.md, ARCHITECTURE.md

---

## 1. Rust構造体の詳細設計

### 1.1 コア構造体

#### Snapshot（スナップショット本体）

```rust
// src-tauri/src/snapshot/mod.rs

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// スナップショットの完全な情報を保持する構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    /// メタデータ
    pub meta: SnapshotMeta,
    /// スナップショットのルートディレクトリパス
    #[serde(skip_serializing)]
    pub root_path: PathBuf,
    /// 含まれるModの一覧（modinfo.jsonから取得）
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
    /// 作成日時（ISO 8601形式）
    pub created_at: DateTime<Utc>,
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
        return Platform::Windows;
        #[cfg(target_os = "macos")]
        return Platform::MacOS;
        #[cfg(target_os = "linux")]
        return Platform::Linux;
    }
}
```

#### SnapshotModInfo（スナップショット内Mod情報）

```rust
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
```

#### SnapshotSummary（一覧表示用）

```rust
/// スナップショット一覧表示用の軽量構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotSummary {
    /// スナップショット名
    pub name: String,
    /// 作成日時
    pub created_at: DateTime<Utc>,
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
            created_at: snapshot.meta.created_at,
            game_version_id: snapshot.meta.game_version_id.clone(),
            platform: snapshot.meta.platform,
            description: snapshot.meta.description.clone(),
            mod_count: snapshot.mods.len(),
            size_bytes: snapshot.size_bytes,
        }
    }
}
```

### 1.2 ゲームバージョン関連

```rust
// src-tauri/src/snapshot/game_version.rs

/// ゲームバージョン情報
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameVersion {
    /// バージョンID（例: "cdda-0.I-2026-01-20-1811"）
    pub id: String,
    /// リリースタイプ
    pub release_type: ReleaseType,
    /// プラットフォーム
    pub platform: Platform,
    /// インストール済みか
    pub is_installed: bool,
    /// インストールパス（インストール済みの場合）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub install_path: Option<PathBuf>,
    /// 使用容量（インストール済みの場合）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
}

/// リリースタイプ
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReleaseType {
    Stable,
    Experimental,
}
```

### 1.3 バリデーション

```rust
// src-tauri/src/snapshot/validation.rs

use regex::Regex;
use lazy_static::lazy_static;

lazy_static! {
    /// スナップショット名の有効パターン
    /// - 1〜64文字
    /// - 英数字、日本語、スペース、ハイフン、アンダースコアのみ
    static ref SNAPSHOT_NAME_REGEX: Regex =
        Regex::new(r"^[\p{L}\p{N}\s\-_]{1,64}$").unwrap();

    /// ゲームバージョンIDの有効パターン
    /// - cdda-{type}-{date}-{hash} 形式
    static ref GAME_VERSION_ID_REGEX: Regex =
        Regex::new(r"^cdda-(0\.[A-Z]|exp)-\d{4}-\d{2}-\d{2}(-\d+)?$").unwrap();
}

impl SnapshotMeta {
    /// バリデーションを実行
    pub fn validate(&self) -> Result<(), ValidationError> {
        // 名前のバリデーション
        if !SNAPSHOT_NAME_REGEX.is_match(&self.name) {
            return Err(ValidationError::InvalidName(self.name.clone()));
        }

        // ゲームバージョンIDのバリデーション
        if !GAME_VERSION_ID_REGEX.is_match(&self.game_version_id) {
            return Err(ValidationError::InvalidGameVersionId(
                self.game_version_id.clone()
            ));
        }

        // 作成日時が未来でないことを確認
        if self.created_at > Utc::now() {
            return Err(ValidationError::FutureTimestamp);
        }

        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("無効なスナップショット名: {0}")]
    InvalidName(String),

    #[error("無効なゲームバージョンID: {0}")]
    InvalidGameVersionId(String),

    #[error("作成日時が未来の日付です")]
    FutureTimestamp,
}
```

---

## 2. シリアライズ/デシリアライズ設計

### 2.1 ファイル形式の使い分け

| 用途 | 形式 | 理由 |
|------|------|------|
| meta.yaml | YAML | 人間が読みやすい、コメント記述可能 |
| Tauri IPC | JSON | フロントエンドとの連携標準 |
| インデックスキャッシュ | JSON | 高速パース |

### 2.2 YAML シリアライズ（meta.yaml）

```rust
// src-tauri/src/snapshot/serialization.rs

use serde_yaml;
use std::fs;
use std::path::Path;

impl SnapshotMeta {
    /// meta.yamlから読み込み
    pub fn load_from_file(path: &Path) -> Result<Self, SerializationError> {
        let content = fs::read_to_string(path)
            .map_err(|e| SerializationError::IoError(e))?;

        let meta: Self = serde_yaml::from_str(&content)
            .map_err(|e| SerializationError::YamlParseError(e))?;

        // バリデーション
        meta.validate()
            .map_err(|e| SerializationError::ValidationError(e))?;

        Ok(meta)
    }

    /// meta.yamlに保存
    pub fn save_to_file(&self, path: &Path) -> Result<(), SerializationError> {
        // バリデーション
        self.validate()
            .map_err(|e| SerializationError::ValidationError(e))?;

        let content = serde_yaml::to_string(self)
            .map_err(|e| SerializationError::YamlSerializeError(e))?;

        // ヘッダーコメントを追加
        let with_header = format!(
            "# Catalyzer Snapshot Metadata\n# DO NOT EDIT MANUALLY\n\n{}",
            content
        );

        fs::write(path, with_header)
            .map_err(|e| SerializationError::IoError(e))?;

        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SerializationError {
    #[error("I/Oエラー: {0}")]
    IoError(#[from] std::io::Error),

    #[error("YAMLパースエラー: {0}")]
    YamlParseError(#[from] serde_yaml::Error),

    #[error("YAMLシリアライズエラー: {0}")]
    YamlSerializeError(serde_yaml::Error),

    #[error("バリデーションエラー: {0}")]
    ValidationError(#[from] ValidationError),
}
```

### 2.3 バージョニング対応

```rust
// src-tauri/src/snapshot/migration.rs

/// スキーマバージョンごとのマイグレーション
pub fn migrate_meta(raw_yaml: &str) -> Result<SnapshotMeta, MigrationError> {
    // まず生のYAMLをパースしてバージョンを確認
    let raw: serde_yaml::Value = serde_yaml::from_str(raw_yaml)?;

    let schema_version = raw
        .get("schema_version")
        .and_then(|v| v.as_u64())
        .unwrap_or(1) as u32;

    match schema_version {
        1 => {
            // 現行バージョン - そのままパース
            Ok(serde_yaml::from_str(raw_yaml)?)
        }
        // 将来のバージョン対応
        // 2 => migrate_v2_to_current(raw_yaml),
        _ => Err(MigrationError::UnsupportedVersion(schema_version)),
    }
}

#[derive(Debug, thiserror::Error)]
pub enum MigrationError {
    #[error("サポートされていないスキーマバージョン: {0}")]
    UnsupportedVersion(u32),

    #[error("YAMLパースエラー: {0}")]
    ParseError(#[from] serde_yaml::Error),
}
```

### 2.4 TypeScript型定義

```typescript
// src/lib/types/snapshot.ts

export type Platform = "windows" | "macos" | "linux";
export type ReleaseType = "stable" | "experimental";

export interface SnapshotMeta {
  name: string;
  createdAt: string; // ISO 8601
  gameVersionId: string;
  platform: Platform;
  description?: string;
  schemaVersion: number;
}

export interface SnapshotModInfo {
  id: string;
  name: string;
  version?: string;
  relativePath: string;
}

export interface Snapshot {
  meta: SnapshotMeta;
  mods: SnapshotModInfo[];
  sizeBytes: number;
}

export interface SnapshotSummary {
  name: string;
  createdAt: string;
  gameVersionId: string;
  platform: Platform;
  description?: string;
  modCount: number;
  sizeBytes: number;
}

export interface GameVersion {
  id: string;
  releaseType: ReleaseType;
  platform: Platform;
  isInstalled: boolean;
  installPath?: string;
  sizeBytes?: number;
}
```

---

## 3. ファイルI/O設計

### 3.1 ディレクトリ構造

```
~/.catalyzer/
├── snapshots/                          # スナップショット群
│   ├── Stable_0I_日本語環境/           # スナップショット名がディレクトリ名
│   │   ├── meta.yaml                   # メタデータ
│   │   ├── mods/                       # Modフォルダ（コピー）
│   │   │   ├── magiclysm/
│   │   │   │   ├── modinfo.json
│   │   │   │   └── ...
│   │   │   └── cata_jp/
│   │   │       └── ...
│   │   ├── config/                     # 設定フォルダ（コピー）
│   │   │   ├── options.json
│   │   │   └── keybindings.json
│   │   └── saves/                      # セーブフォルダ（コピー、オプション）
│   │       └── MyWorld/
│   │
│   └── .index.json                     # スナップショットインデックス（キャッシュ）
│
├── cache/
│   └── games/                          # ダウンロード済みゲーム本体
│       ├── cdda-0.I-2026-01-20-1811/
│       └── cdda-exp-2026-01-25/
│
└── settings.yaml                       # グローバル設定
```

### 3.2 原子性確保（Atomic Write）

```rust
// src-tauri/src/snapshot/atomic.rs

use std::fs;
use std::path::{Path, PathBuf};
use tempfile::NamedTempFile;

/// 原子的なファイル書き込み
/// 一時ファイルに書き込み後、リネームで置き換える
pub fn atomic_write<P: AsRef<Path>>(
    path: P,
    content: &[u8],
) -> Result<(), AtomicWriteError> {
    let path = path.as_ref();
    let parent = path.parent()
        .ok_or(AtomicWriteError::NoParentDirectory)?;

    // 同じディレクトリに一時ファイルを作成
    let temp_file = NamedTempFile::new_in(parent)
        .map_err(|e| AtomicWriteError::TempFileCreation(e))?;

    // 一時ファイルに書き込み
    fs::write(temp_file.path(), content)
        .map_err(|e| AtomicWriteError::WriteError(e))?;

    // 原子的にリネーム
    temp_file.persist(path)
        .map_err(|e| AtomicWriteError::PersistError(e))?;

    Ok(())
}

/// 原子的なディレクトリコピー
/// 一時ディレクトリにコピー後、リネームで置き換える
pub fn atomic_copy_dir<P: AsRef<Path>, Q: AsRef<Path>>(
    src: P,
    dst: Q,
) -> Result<(), AtomicWriteError> {
    let src = src.as_ref();
    let dst = dst.as_ref();
    let parent = dst.parent()
        .ok_or(AtomicWriteError::NoParentDirectory)?;

    // 一時ディレクトリを作成
    let temp_dir = tempfile::tempdir_in(parent)
        .map_err(|e| AtomicWriteError::TempFileCreation(e))?;

    // 再帰的にコピー
    copy_dir_recursive(src, temp_dir.path())?;

    // 既存のディレクトリがあれば削除
    if dst.exists() {
        fs::remove_dir_all(dst)
            .map_err(|e| AtomicWriteError::RemoveError(e))?;
    }

    // 原子的にリネーム
    fs::rename(temp_dir.path(), dst)
        .map_err(|e| AtomicWriteError::RenameError(e))?;

    // tempdir のドロップを防ぐ
    std::mem::forget(temp_dir);

    Ok(())
}

/// ディレクトリの再帰コピー
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), AtomicWriteError> {
    fs::create_dir_all(dst)
        .map_err(|e| AtomicWriteError::CreateDirError(e))?;

    for entry in fs::read_dir(src)
        .map_err(|e| AtomicWriteError::ReadDirError(e))?
    {
        let entry = entry.map_err(|e| AtomicWriteError::ReadDirError(e))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| AtomicWriteError::CopyError(e))?;
        }
    }

    Ok(())
}

#[derive(Debug, thiserror::Error)]
pub enum AtomicWriteError {
    #[error("親ディレクトリがありません")]
    NoParentDirectory,

    #[error("一時ファイル作成エラー: {0}")]
    TempFileCreation(std::io::Error),

    #[error("書き込みエラー: {0}")]
    WriteError(std::io::Error),

    #[error("永続化エラー: {0}")]
    PersistError(tempfile::PersistError),

    #[error("削除エラー: {0}")]
    RemoveError(std::io::Error),

    #[error("リネームエラー: {0}")]
    RenameError(std::io::Error),

    #[error("ディレクトリ作成エラー: {0}")]
    CreateDirError(std::io::Error),

    #[error("ディレクトリ読み取りエラー: {0}")]
    ReadDirError(std::io::Error),

    #[error("コピーエラー: {0}")]
    CopyError(std::io::Error),
}
```

### 3.3 ロック機構

```rust
// src-tauri/src/snapshot/lock.rs

use std::fs::{File, OpenOptions};
use std::path::{Path, PathBuf};
use fs2::FileExt;

/// スナップショット操作用のファイルロック
pub struct SnapshotLock {
    lock_file: File,
    lock_path: PathBuf,
}

impl SnapshotLock {
    /// ロックファイルのパス
    fn lock_path(snapshots_dir: &Path) -> PathBuf {
        snapshots_dir.join(".lock")
    }

    /// 排他ロックを取得（書き込み操作用）
    pub fn acquire_exclusive(snapshots_dir: &Path) -> Result<Self, LockError> {
        let lock_path = Self::lock_path(snapshots_dir);

        let lock_file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(&lock_path)
            .map_err(|e| LockError::OpenError(e))?;

        // 非ブロッキングでロック取得を試行
        lock_file.try_lock_exclusive()
            .map_err(|_| LockError::AlreadyLocked)?;

        Ok(Self { lock_file, lock_path })
    }

    /// 共有ロックを取得（読み取り操作用）
    pub fn acquire_shared(snapshots_dir: &Path) -> Result<Self, LockError> {
        let lock_path = Self::lock_path(snapshots_dir);

        let lock_file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(&lock_path)
            .map_err(|e| LockError::OpenError(e))?;

        lock_file.try_lock_shared()
            .map_err(|_| LockError::AlreadyLocked)?;

        Ok(Self { lock_file, lock_path })
    }
}

impl Drop for SnapshotLock {
    fn drop(&mut self) {
        // ロックを解放
        let _ = self.lock_file.unlock();
    }
}

#[derive(Debug, thiserror::Error)]
pub enum LockError {
    #[error("ロックファイルを開けません: {0}")]
    OpenError(std::io::Error),

    #[error("別のプロセスがロックを保持しています")]
    AlreadyLocked,
}
```

### 3.4 スナップショットインデックス

```rust
// src-tauri/src/snapshot/index.rs

use std::collections::HashMap;
use std::path::Path;

/// スナップショットのインデックス（高速検索用キャッシュ）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotIndex {
    /// 最終更新日時
    pub updated_at: DateTime<Utc>,
    /// スナップショット一覧（名前 -> サマリー）
    pub snapshots: HashMap<String, SnapshotSummary>,
}

impl SnapshotIndex {
    /// インデックスファイルのパス
    fn index_path(snapshots_dir: &Path) -> PathBuf {
        snapshots_dir.join(".index.json")
    }

    /// インデックスを読み込み（存在しない場合は再構築）
    pub fn load_or_rebuild(snapshots_dir: &Path) -> Result<Self, IndexError> {
        let index_path = Self::index_path(snapshots_dir);

        if index_path.exists() {
            let content = fs::read_to_string(&index_path)?;
            let index: Self = serde_json::from_str(&content)?;

            // インデックスが古くないか確認（5分以内なら使用）
            let age = Utc::now() - index.updated_at;
            if age < chrono::Duration::minutes(5) {
                return Ok(index);
            }
        }

        // 再構築
        Self::rebuild(snapshots_dir)
    }

    /// インデックスを再構築
    pub fn rebuild(snapshots_dir: &Path) -> Result<Self, IndexError> {
        let mut snapshots = HashMap::new();

        for entry in fs::read_dir(snapshots_dir)? {
            let entry = entry?;
            let path = entry.path();

            // ディレクトリかつ隠しファイルでない
            if path.is_dir() && !entry.file_name().to_string_lossy().starts_with('.') {
                let meta_path = path.join("meta.yaml");
                if meta_path.exists() {
                    match SnapshotMeta::load_from_file(&meta_path) {
                        Ok(meta) => {
                            let size = calculate_dir_size(&path)?;
                            let mod_count = count_mods(&path.join("mods"))?;

                            let summary = SnapshotSummary {
                                name: meta.name.clone(),
                                created_at: meta.created_at,
                                game_version_id: meta.game_version_id,
                                platform: meta.platform,
                                description: meta.description,
                                mod_count,
                                size_bytes: size,
                            };

                            snapshots.insert(meta.name, summary);
                        }
                        Err(e) => {
                            // ログに記録して続行
                            tracing::warn!("スナップショット読み込みエラー: {:?} - {}", path, e);
                        }
                    }
                }
            }
        }

        let index = Self {
            updated_at: Utc::now(),
            snapshots,
        };

        // インデックスを保存
        index.save(snapshots_dir)?;

        Ok(index)
    }

    /// インデックスを保存
    pub fn save(&self, snapshots_dir: &Path) -> Result<(), IndexError> {
        let index_path = Self::index_path(snapshots_dir);
        let content = serde_json::to_string_pretty(self)?;
        atomic_write(&index_path, content.as_bytes())?;
        Ok(())
    }
}

/// ディレクトリサイズを計算
fn calculate_dir_size(path: &Path) -> Result<u64, std::io::Error> {
    let mut size = 0;

    for entry in walkdir::WalkDir::new(path) {
        let entry = entry?;
        if entry.file_type().is_file() {
            size += entry.metadata()?.len();
        }
    }

    Ok(size)
}

/// Mod数をカウント
fn count_mods(mods_dir: &Path) -> Result<usize, std::io::Error> {
    if !mods_dir.exists() {
        return Ok(0);
    }

    let count = fs::read_dir(mods_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .filter(|e| e.path().join("modinfo.json").exists())
        .count();

    Ok(count)
}

#[derive(Debug, thiserror::Error)]
pub enum IndexError {
    #[error("I/Oエラー: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSONパースエラー: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("ディレクトリ走査エラー: {0}")]
    WalkError(#[from] walkdir::Error),

    #[error("原子書き込みエラー: {0}")]
    AtomicError(#[from] AtomicWriteError),
}
```

---

## 4. エラーハンドリング設計

### 4.1 エラー型の階層構造

```rust
// src-tauri/src/snapshot/error.rs

use thiserror::Error;

/// スナップショット操作の統合エラー型
#[derive(Debug, Error)]
pub enum SnapshotError {
    // === 検証エラー ===
    #[error("スナップショット '{0}' は既に存在します")]
    AlreadyExists(String),

    #[error("スナップショット '{0}' が見つかりません")]
    NotFound(String),

    #[error("無効なスナップショット名: {0}")]
    InvalidName(String),

    #[error("バリデーションエラー: {0}")]
    Validation(#[from] ValidationError),

    // === I/Oエラー ===
    #[error("ファイル操作エラー: {0}")]
    Io(#[from] std::io::Error),

    #[error("ディレクトリコピーエラー: {0}")]
    CopyDir(String),

    #[error("容量不足: 必要 {required} バイト、空き {available} バイト")]
    InsufficientSpace { required: u64, available: u64 },

    // === シリアライズエラー ===
    #[error("シリアライズエラー: {0}")]
    Serialization(#[from] SerializationError),

    // === ロックエラー ===
    #[error("ロック取得エラー: {0}")]
    Lock(#[from] LockError),

    // === ゲームバージョンエラー ===
    #[error("ゲームバージョン '{0}' が見つかりません")]
    GameVersionNotFound(String),

    #[error("ゲームダウンロードエラー: {0}")]
    GameDownload(String),

    // === プラットフォームエラー ===
    #[error("プラットフォーム不一致: スナップショットは {snapshot} 用ですが、現在のプラットフォームは {current} です")]
    PlatformMismatch { snapshot: Platform, current: Platform },

    // === 内部エラー ===
    #[error("内部エラー: {0}")]
    Internal(String),
}

impl SnapshotError {
    /// ユーザー向けのエラーメッセージを取得
    pub fn user_message(&self) -> String {
        match self {
            Self::AlreadyExists(name) => {
                format!("「{}」という名前のスナップショットは既に存在します。別の名前を使用してください。", name)
            }
            Self::NotFound(name) => {
                format!("スナップショット「{}」が見つかりません。", name)
            }
            Self::InsufficientSpace { required, available } => {
                let required_mb = required / 1024 / 1024;
                let available_mb = available / 1024 / 1024;
                format!(
                    "ディスク容量が不足しています。必要: {}MB、空き: {}MB",
                    required_mb, available_mb
                )
            }
            Self::PlatformMismatch { snapshot, current } => {
                format!(
                    "このスナップショットは{}用に作成されました。現在の環境（{}）では使用できません。",
                    platform_name(*snapshot),
                    platform_name(*current)
                )
            }
            _ => self.to_string(),
        }
    }

    /// リトライ可能かどうか
    pub fn is_retryable(&self) -> bool {
        matches!(self,
            Self::Lock(_) |
            Self::GameDownload(_) |
            Self::Io(_)
        )
    }
}

fn platform_name(platform: Platform) -> &'static str {
    match platform {
        Platform::Windows => "Windows",
        Platform::MacOS => "macOS",
        Platform::Linux => "Linux",
    }
}
```

### 4.2 Tauri コマンドでのエラー変換

```rust
// src-tauri/src/snapshot/commands.rs

use tauri::command;

/// エラーをTauriコマンド用に変換
impl From<SnapshotError> for String {
    fn from(err: SnapshotError) -> Self {
        err.user_message()
    }
}

#[command]
pub async fn create_snapshot(
    name: String,
    description: Option<String>,
    include_saves: bool,
) -> Result<SnapshotSummary, String> {
    let result = snapshot_service::create(&name, description, include_saves)
        .await
        .map_err(|e| e.user_message())?;

    Ok(result.into())
}
```

### 4.3 リカバリー戦略

```rust
// src-tauri/src/snapshot/recovery.rs

/// スナップショット作成時のリカバリー
pub async fn create_with_recovery(
    name: &str,
    description: Option<String>,
    include_saves: bool,
) -> Result<SnapshotSummary, SnapshotError> {
    let snapshots_dir = get_snapshots_dir();
    let snapshot_dir = snapshots_dir.join(sanitize_dirname(name));

    // ロールバック用のクリーンアップ関数
    let cleanup = || {
        if snapshot_dir.exists() {
            let _ = fs::remove_dir_all(&snapshot_dir);
        }
    };

    // 作成を試行
    match create_snapshot_internal(name, description, include_saves).await {
        Ok(summary) => Ok(summary),
        Err(e) => {
            // 失敗時はクリーンアップ
            tracing::error!("スナップショット作成失敗、クリーンアップ実行: {}", e);
            cleanup();
            Err(e)
        }
    }
}

/// 復元時のリカバリー
pub async fn restore_with_recovery(
    name: &str,
) -> Result<(), SnapshotError> {
    // 復元前の状態をバックアップ
    let backup_name = format!("_backup_{}", Utc::now().format("%Y%m%d_%H%M%S"));

    // 現在の状態を一時バックアップ
    if let Err(e) = create_temporary_backup(&backup_name).await {
        tracing::warn!("バックアップ作成失敗（続行）: {}", e);
    }

    // 復元を試行
    match restore_snapshot_internal(name).await {
        Ok(()) => {
            // 成功したらバックアップを削除
            let _ = delete_temporary_backup(&backup_name).await;
            Ok(())
        }
        Err(e) => {
            // 失敗時はバックアップから復旧
            tracing::error!("復元失敗、バックアップから復旧: {}", e);
            if let Err(restore_err) = restore_from_backup(&backup_name).await {
                tracing::error!("復旧も失敗: {}", restore_err);
                return Err(SnapshotError::Internal(format!(
                    "復元失敗かつ復旧も失敗: {} -> {}",
                    e, restore_err
                )));
            }
            Err(e)
        }
    }
}
```

---

## 5. パフォーマンス考慮点

### 5.1 大量スナップショット時の対応

#### インデックスキャッシュの活用

```rust
// インデックスを活用した一覧取得
pub async fn list_snapshots() -> Result<Vec<SnapshotSummary>, SnapshotError> {
    let snapshots_dir = get_snapshots_dir();

    // インデックスから取得（ファイルシステムを走査しない）
    let index = SnapshotIndex::load_or_rebuild(&snapshots_dir)?;

    let mut summaries: Vec<_> = index.snapshots.values().cloned().collect();

    // 作成日時の降順でソート
    summaries.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(summaries)
}
```

#### 遅延読み込み

```rust
/// スナップショット詳細は必要な時だけ読み込む
pub async fn get_snapshot_details(name: &str) -> Result<Snapshot, SnapshotError> {
    let snapshots_dir = get_snapshots_dir();
    let snapshot_dir = snapshots_dir.join(name);

    // meta.yamlのみ先に読み込み
    let meta_path = snapshot_dir.join("meta.yaml");
    let meta = SnapshotMeta::load_from_file(&meta_path)?;

    // Mod一覧は遅延読み込み
    let mods = load_snapshot_mods(&snapshot_dir.join("mods"))?;

    // サイズは必要な時だけ計算
    let size_bytes = calculate_dir_size(&snapshot_dir)?;

    Ok(Snapshot {
        meta,
        root_path: snapshot_dir,
        mods,
        size_bytes,
    })
}
```

### 5.2 コピー処理の最適化

#### 並列コピー

```rust
use rayon::prelude::*;
use std::sync::atomic::{AtomicU64, Ordering};

/// 並列ディレクトリコピー（大量ファイル時に高速）
pub async fn parallel_copy_dir(
    src: &Path,
    dst: &Path,
    progress: Option<&ProgressCallback>,
) -> Result<u64, SnapshotError> {
    let total_copied = AtomicU64::new(0);

    // ファイル一覧を取得
    let entries: Vec<_> = walkdir::WalkDir::new(src)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .collect();

    let total_files = entries.len();

    // 並列でコピー
    entries.par_iter().try_for_each(|entry| {
        let rel_path = entry.path().strip_prefix(src).unwrap();
        let dst_path = dst.join(rel_path);

        // 親ディレクトリを作成
        if let Some(parent) = dst_path.parent() {
            fs::create_dir_all(parent)?;
        }

        // ファイルをコピー
        let bytes = fs::copy(entry.path(), &dst_path)?;
        total_copied.fetch_add(bytes, Ordering::Relaxed);

        // 進捗報告
        if let Some(cb) = progress {
            cb(total_copied.load(Ordering::Relaxed), total_files as u64);
        }

        Ok::<_, std::io::Error>(())
    })?;

    Ok(total_copied.load(Ordering::Relaxed))
}
```

#### 増分コピー（将来の最適化）

```rust
// 要検討: 将来的な増分コピー実装
// ファイルのハッシュを比較して変更されたものだけコピー

/// ファイル変更検出用のハッシュ計算
pub fn calculate_file_hash(path: &Path) -> Result<String, std::io::Error> {
    use sha2::{Sha256, Digest};

    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher)?;

    Ok(format!("{:x}", hasher.finalize()))
}

// 注意: 増分コピーは複雑性が増すため、Phase 1では実装しない
// 容量が問題になった場合に検討
```

### 5.3 インデックス設計

#### ファイルシステムインデックス

```rust
/// スナップショットの高速検索用インデックス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotIndex {
    /// 最終更新日時
    pub updated_at: DateTime<Utc>,
    /// スナップショット名 -> サマリー
    pub by_name: HashMap<String, SnapshotSummary>,
    /// ゲームバージョンID -> スナップショット名リスト
    pub by_game_version: HashMap<String, Vec<String>>,
    /// 作成日時でソートされた名前リスト（降順）
    pub by_created_at: Vec<String>,
}

impl SnapshotIndex {
    /// ゲームバージョンでフィルタ
    pub fn filter_by_game_version(&self, version_id: &str) -> Vec<&SnapshotSummary> {
        self.by_game_version
            .get(version_id)
            .map(|names| {
                names.iter()
                    .filter_map(|n| self.by_name.get(n))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// 最新N件を取得
    pub fn get_recent(&self, limit: usize) -> Vec<&SnapshotSummary> {
        self.by_created_at
            .iter()
            .take(limit)
            .filter_map(|n| self.by_name.get(n))
            .collect()
    }
}
```

### 5.4 メモリ使用量の最適化

```rust
/// ストリーミング読み込み（大きなファイルのメモリ効率的な処理）
pub fn stream_copy<R: Read, W: Write>(
    reader: &mut R,
    writer: &mut W,
    buffer_size: usize,
) -> Result<u64, std::io::Error> {
    let mut buffer = vec![0u8; buffer_size];
    let mut total = 0u64;

    loop {
        let bytes_read = reader.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        writer.write_all(&buffer[..bytes_read])?;
        total += bytes_read as u64;
    }

    Ok(total)
}

// 推奨バッファサイズ
const COPY_BUFFER_SIZE: usize = 64 * 1024; // 64KB
```

---

## 6. 要検討事項

### 6.1 設計上の判断が必要な項目

| 項目 | 選択肢 | 推奨 | 理由 |
|------|--------|------|------|
| スナップショット名の一意性 | ディレクトリ名 / UUID | ディレクトリ名 | シンプル、ユーザーが理解しやすい |
| 削除時の確認 | ソフトデリート / 即削除 | 即削除 | シンプルさ優先、ゴミ箱は複雑化 |
| 増分コピー | 実装する / しない | Phase 1ではしない | 複雑性とのトレードオフ |
| プラットフォーム間互換性 | 警告のみ / エラー | 警告のみ | ユーザー判断に委ねる |

### 6.2 今後の拡張ポイント

1. **圧縮保存**: スナップショットをzip/tar.gzで圧縮保存するオプション
2. **クラウド同期**: スナップショットのクラウドバックアップ
3. **差分バックアップ**: 変更ファイルのみを保存する増分方式
4. **インポート/エクスポート**: 他ユーザーとのスナップショット共有

---

## 変更履歴

| 日付 | 版 | 内容 |
|------|-----|------|
| 2026-01-27 | v1.0 | 初版作成 |
