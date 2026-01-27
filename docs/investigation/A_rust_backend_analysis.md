# Rustバックエンド現行調査報告書

> **調査日**: 2026-01-27
> **調査担当**: 足軽1号
> **対象**: /home/tishi/prj/catalyzer/src-tauri/src/

---

## 1. ディレクトリ構造の全体像

```
src-tauri/src/
├── main.rs              # エントリポイント、Tauriコマンド登録
├── model/
│   └── mod.rs           # データモデル定義（Mod, ModInfo, LocalVersion）
├── profile/
│   └── mod.rs           # プロファイル・設定管理、AppState
├── cdda/
│   ├── mod.rs           # モジュール公開
│   ├── launch.rs        # ゲーム起動機能
│   ├── release.rs       # GitHubリリース取得
│   └── translation.rs   # 翻訳機能（未完成）
├── files/
│   ├── mod.rs           # ファイル操作ユーティリティ
│   └── symlink.rs       # シンボリックリンク操作
├── git/
│   └── mod.rs           # Git操作（git2クレート使用）
├── paths/
│   └── mod.rs           # パスユーティリティ
├── zip/
│   └── mod.rs           # Zip展開（文字コード対応）
└── dmg/
    └── mod.rs           # DMG展開（macOS専用）
```

**総ファイル数**: 13ファイル
**総行数**: 約1,800行

---

## 2. 各モジュールの責務と依存関係

### 2.1 依存関係図

```
                    ┌──────────────┐
                    │   main.rs    │
                    │ (エントリ)   │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   profile    │  │    cdda      │  │    files     │
│  (設定管理)  │  │ (CDDA連携)   │  │ (ファイル)   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │    ┌────────────┼─────────────────┤
       │    │            │                 │
       ▼    ▼            ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     git      │  │    paths     │  │   symlink    │
│  (Git操作)   │  │  (パス管理)  │  │ (リンク操作) │
└──────────────┘  └──────────────┘  └──────────────┘
       │
       ▼
┌──────────────┐
│    model     │
│ (データ型)   │
└──────────────┘

独立モジュール:
┌──────────────┐  ┌──────────────┐
│     zip      │  │     dmg      │
│  (Zip展開)   │  │  (DMG展開)   │
└──────────────┘  └──────────────┘
```

### 2.2 モジュール責務一覧

| モジュール | 責務 | 主要な依存 |
|-----------|------|-----------|
| `main` | アプリケーション初期化、コマンド登録、スプラッシュ画面制御 | 全モジュール |
| `profile` | プロファイル/設定のCRUD、Mod状態管理、永続化 | git, files, paths, model |
| `model` | Mod, ModInfo, LocalVersion のデータ構造定義 | なし（プリミティブ） |
| `cdda` | CDDA固有ロジック（起動、リリース取得） | paths, git, files |
| `files` | ファイル操作、シンボリックリンク管理 | paths |
| `git` | Git操作（clone, commit, checkout, fetch等） | paths |
| `paths` | アプリケーションパス管理 | なし |
| `zip` | Zipファイル展開、文字コード修正 | files, paths |
| `dmg` | DMGファイルマウント・コピー（macOS専用） | なし |

---

## 3. profile/mod.rs の実装詳細

### 3.1 主要構造体

#### UserDataPaths（ユーザーデータパス）
```rust
pub struct UserDataPaths {
    root: PathBuf,      // プロファイルのルートディレクトリ
    pub mods: PathBuf,  // Modディレクトリ
    config: PathBuf,    // 設定ディレクトリ
    font: PathBuf,      // フォントディレクトリ
    save: PathBuf,      // セーブディレクトリ
    sound: PathBuf,     // サウンドディレクトリ
    gfx: PathBuf,       // グラフィックスディレクトリ
}
```

#### Profile（プロファイル）
```rust
pub struct Profile {
    id: String,                       // 一意識別子
    name: String,                     // 表示名
    game_path: Option<PathBuf>,       // ゲーム実行ファイルパス
    profile_path: UserDataPaths,      // ユーザーデータパス
    mod_status: Vec<Mod>,             // Mod状態リスト
    is_active: bool,                  // アクティブフラグ
}
```

#### Settings（設定）
```rust
pub struct Settings {
    pub language: String,            // 言語設定（"ja", "en"等）
    pub mod_data_path: PathBuf,      // Modデータ保存パス
    pub profiles: Vec<Profile>,      // プロファイル一覧
}
```

#### AppState（アプリケーション状態）
```rust
pub struct AppState {
    settings: Mutex<Settings>,       // スレッドセーフな設定
}
```

### 3.2 CRUD操作

| 操作 | 関数 | 説明 |
|------|------|------|
| Create | `add_profile()` | 新規プロファイル作成、ディレクトリ作成、アクティブ化 |
| Read | `get_settings()` | 全設定取得 |
| Read | `get_active_profile()` | アクティブプロファイル取得 |
| Update | `edit_profile()` | プロファイル名・ゲームパス更新 |
| Update | `set_profile_active()` | アクティブプロファイル切替 |
| Delete | `remove_profile()` | プロファイル削除（ディレクトリ含む） |

### 3.3 Mod状態管理

```rust
// Modスキャン処理（profile/mod.rs:234-276）
pub fn scan_mods(&self) -> Result<Vec<Mod>> {
    // 1. 既存シンボリックリンク一覧取得
    // 2. mod_data_path内のディレクトリを並列走査
    // 3. modinfo.json読み込み → ModInfo生成
    // 4. Gitリポジトリ情報取得 → LocalVersion生成
    // 5. インストール状態判定
    // 6. ソートして返却
}
```

### 3.4 永続化

- ファイル: `{app_data_dir}/setting.yaml`
- フォーマット: YAML (serde_yaml)
- タイミング: 設定変更時に即座に書き込み

---

## 4. cdda/ モジュールの役割

### 4.1 サブモジュール構成

| ファイル | 責務 |
|---------|------|
| `launch.rs` | ゲーム起動、Mod検査 |
| `release.rs` | GitHubリリース情報取得 |
| `translation.rs` | Mod翻訳機能（未完成） |

### 4.2 launch.rs

**主要機能:**
- `launch_game`: ゲーム起動（プラットフォーム別実装）
- `inspect_mods`: Mod互換性チェック（--check-modsオプション使用）

**プラットフォーム対応:**
```rust
#[cfg(target_os = "windows")]
fn launch(...) {
    // cmd /C で起動、--userdirオプション付与
}

#[cfg(target_os = "macos")]
fn launch(...) {
    // chmod +x 後、DYLD_LIBRARY_PATH設定して起動
}

#[cfg(target_os = "linux")]
fn launch(...) {
    // sh -c で起動
}
```

### 4.3 release.rs

**主要機能:**
- `cdda_get_stable_releases`: Stableリリース取得（ハードコード方式）
- `cdda_get_latest_releases`: Experimentalリリース取得（GitHub API）
- `github_rate_limit`: GitHub APIレート制限確認

**Stableリリースハードコード:**
```rust
const STABLE_RELEASES: &[StableRelease] = &[
    StableRelease { version: "0.I", ... },
    StableRelease { version: "0.H", ... },
    StableRelease { version: "0.G", ... },
];
```

**要検討**: Stableリリースはハードコードされているため、新バージョンリリース時にコード更新が必要。

### 4.4 translation.rs

**状態**: 未完成（コメントアウト状態）

目的はMod翻訳支援だが、Pythonスクリプト依存のため実装が中断。

---

## 5. files/ モジュールの役割

### 5.1 主要機能

| 関数 | 説明 |
|------|------|
| `remove_dir_all()` | ディレクトリ削除（除外パターン対応） |
| `copy_dir_all()` | ディレクトリ再帰コピー（除外パターン対応） |
| `get_modinfo_path()` | modinfo.jsonパス取得 |
| `is_mod_dir()` | Modディレクトリ判定 |
| `get_shallowest_mod_dir()` | 最も浅いModディレクトリ探索 |

### 5.2 symlink.rs

| 関数 | 説明 |
|------|------|
| `is_symlink()` | シンボリックリンク判定（Windows: junction使用） |
| `list_symlinks()` | ディレクトリ内シンボリックリンク一覧 |
| `create_symbolic_link()` | シンボリックリンク作成（Windows: junction使用） |

### 5.3 Tauriコマンド

| コマンド | 説明 |
|---------|------|
| `open_dir` | ファイルマネージャでディレクトリを開く |
| `open_mod_data` | Modデータディレクトリを開く |
| `install_mod` | Modインストール（シンボリックリンク作成） |
| `uninstall_mod` | Modアンインストール（シンボリックリンク削除） |
| `install_all_mods` | 全Modインストール |
| `uninstall_all_mods` | 全Modアンインストール |

---

## 6. git/ モジュールの役割

### 6.1 概要

git2クレートを使用したGit操作機能。Modのバージョン管理に使用。

### 6.2 主要関数

| 関数 | 説明 |
|------|------|
| `open()` | リポジトリを開く |
| `init()` | リポジトリ初期化 |
| `commit()` | 変更をコミット |
| `fetch()` | リモートからフェッチ |
| `pull_rebase()` | プルリベース |
| `reset_hard()` | ハードリセット |
| `list_branches()` | ブランチ一覧取得 |
| `checkout()` | ブランチ切替 |
| `git_clone()` | リポジトリクローン |
| `ls_remote_tags()` | リモートタグ一覧取得 |

### 6.3 Tauriコマンド

| コマンド | 説明 |
|---------|------|
| `git_init` | Modディレクトリでリポジトリ初期化 |
| `git_commit_changes` | 変更をコミット |
| `git_reset_changes` | 変更をリセット |
| `git_list_branches` | ブランチ一覧 |
| `git_checkout` | ブランチ切替 |
| `git_clone_mod_repo` | ModリポジトリをクローンModディレクトリに |
| `git_fetch_all_mods` | 全Modをフェッチ |

### 6.4 VISION.mdとの関係

VISION.mdによると、gitはユーザーに見せない内部実装として段階的に廃止予定。
スナップショット方式への移行に伴い、このモジュールの使用は減少する見込み。

---

## 7. 現行アーキテクチャの課題点

### 7.1 設計上の課題

| 課題 | 詳細 | 影響度 |
|------|------|--------|
| **Git依存** | ユーザーにgit概念が露出している | 高 |
| **Stableリリースハードコード** | 新リリース時にコード更新が必要 | 中 |
| **translation.rs未完成** | Python依存で実装中断 | 低 |
| **profile/mod.rsの肥大化** | 476行、責務が多い | 中 |

### 7.2 コード品質の課題

| 箇所 | 課題 | 行番号 |
|------|------|--------|
| `profile/mod.rs` | 条件式バグ `if game_path.is_none() && game_path.is_some()` | 388 |
| `paths/mod.rs` | macOSでtypo `cataylzer` | 15 |
| `files/mod.rs` | 条件式バグ `if skipped < 0` | 31 |
| `git/mod.rs` | unwrap多用、エラーハンドリング不足 | 複数箇所 |

### 7.3 プラットフォーム対応

| 機能 | Windows | macOS | Linux |
|------|---------|-------|-------|
| ゲーム起動 | ○ | ○ | ○ |
| シンボリックリンク | junction使用 | symlink | symlink |
| DMG展開 | - | ○ | - |
| open_dir | ○ | ○ | コメントアウト |

**要検討**: Linux対応はget_platform()でパニック、open_dirもコメントアウト状態。

---

## 8. 新アーキテクチャ移行時の影響範囲

### 8.1 影響を受けるモジュール

| モジュール | 変更内容 | 影響度 |
|-----------|---------|--------|
| `profile/mod.rs` | スナップショット構造への変更、git依存削除 | 大 |
| `git/mod.rs` | 内部利用のみに限定、または廃止 | 大 |
| `cdda/release.rs` | ゲームバージョン管理機能追加 | 中 |
| `files/mod.rs` | スナップショットのコピー/復元機能追加 | 中 |
| `paths/mod.rs` | スナップショットディレクトリ追加 | 小 |

### 8.2 新規追加が必要な機能

ARCHITECTURE.mdに記載された新APIに基づく：

```rust
// 新規追加予定のTauriコマンド
fn create_snapshot(name: String, include_saves: bool) -> Result<Snapshot>;
fn list_snapshots() -> Result<Vec<SnapshotSummary>>;
fn restore_snapshot(snapshot_id: String) -> Result<()>;
fn delete_snapshot(snapshot_id: String) -> Result<()>;
fn get_installed_game_versions() -> Result<Vec<GameVersion>>;
fn download_game_version(version_id: String, on_progress: Channel<DownloadProgress>) -> Result<()>;
fn delete_game_version(version_id: String) -> Result<()>;
fn get_storage_usage() -> Result<StorageUsage>;
fn cleanup_old_snapshots(keep_days: u32, keep_min_count: u32) -> Result<CleanupResult>;
```

### 8.3 移行ステップ提案

1. **Phase 1**: paths/mod.rsにスナップショット関連パス追加
2. **Phase 2**: 新しいsnapshot/mod.rsモジュール作成
3. **Phase 3**: profile/mod.rsからgit依存部分を分離
4. **Phase 4**: UIからgit機能を隠蔽（コマンドは残すが非公開）
5. **Phase 5**: 完全移行後、git機能の段階的削除

---

## 9. 参考情報

### 9.1 使用クレート

| クレート | 用途 |
|---------|------|
| `tauri` | アプリケーションフレームワーク |
| `serde`, `serde_yaml`, `serde_json` | シリアライゼーション |
| `git2` | Git操作 |
| `reqwest` | HTTP通信 |
| `regex` | 正規表現 |
| `chrono` | 日時処理 |
| `rayon` | 並列処理 |
| `anyhow` | エラーハンドリング |
| `zip_extract` | Zip展開 |
| `zifu_core` | Zip文字コード修正 |
| `junction` | Windowsジャンクション |
| `dmg` | macOS DMGマウント |
| `fs_extra` | ファイル操作拡張 |

### 9.2 ファイル別行数

| ファイル | 行数 |
|---------|------|
| profile/mod.rs | 476 |
| git/mod.rs | 359 |
| cdda/release.rs | 358 |
| files/mod.rs | 253 |
| main.rs | 237 |
| cdda/launch.rs | 152 |
| zip/mod.rs | 164 |
| files/symlink.rs | 110 |
| dmg/mod.rs | 91 |
| model/mod.rs | 87 |
| paths/mod.rs | 38 |
| cdda/translation.rs | 30 |
| cdda/mod.rs | 4 |

---

**報告終了**
