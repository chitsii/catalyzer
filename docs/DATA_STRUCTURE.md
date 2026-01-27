# Catalyzer データ構造設計書

> **最終更新**: 2026-01-27
> **ステータス**: 承認済み

---

## 1. 現行データ構造

### 1.1 Rust側（バックエンド）

#### Settings
アプリケーション全体の設定を管理する構造体。

```rust
// src-tauri/src/profile/mod.rs
pub struct Settings {
    pub language: String,           // UI言語 ("ja", "en"等)
    pub mod_data_path: PathBuf,     // Mod保存ディレクトリ
    pub profiles: Vec<Profile>,     // プロファイル一覧
}
```

#### Profile
ゲーム環境の設定単位を表す構造体。

```rust
// src-tauri/src/profile/mod.rs
pub struct Profile {
    id: String,                     // 一意識別子
    name: String,                   // 表示名
    game_path: Option<PathBuf>,     // ゲーム実行ファイルパス
    profile_path: UserDataPaths,    // ユーザーデータパス群
    mod_status: Vec<Mod>,           // Mod一覧と状態
    is_active: bool,                // アクティブフラグ
}
```

#### UserDataPaths
プロファイルに紐づくディレクトリ群を管理する構造体。

```rust
// src-tauri/src/profile/mod.rs
pub struct UserDataPaths {
    root: PathBuf,      // ルートディレクトリ
    pub mods: PathBuf,  // mods/
    config: PathBuf,    // config/
    font: PathBuf,      // font/
    save: PathBuf,      // save/
    sound: PathBuf,     // sound/
    gfx: PathBuf,       // gfx/
}
```

#### Mod
個別Modの情報と状態を保持する構造体。

```rust
// src-tauri/src/model/mod.rs
#[serde(rename_all = "camelCase")]
pub struct Mod {
    pub info: ModInfo,                      // Mod基本情報
    pub local_version: Option<LocalVersion>, // gitバージョン情報
    pub is_installed: bool,                 // インストール状態
    pub local_path: String,                 // ローカルパス
}
```

#### ModInfo
Modのメタデータ（modinfo.jsonから取得）を保持する構造体。

```rust
// src-tauri/src/model/mod.rs
#[serde(rename_all = "camelCase")]
pub struct ModInfo {
    ident: Option<String>,              // Mod識別子（新形式）
    id: Option<String>,                 // Mod識別子（旧形式）
    name: String,                       // 表示名
    authors: Option<StringOrVec>,       // 作成者
    description: Option<String>,        // 説明
    category: Option<String>,           // カテゴリ
    dependencies: Option<StringOrVec>,  // 依存Mod
    maintainers: Option<StringOrVec>,   // メンテナー
    version: Option<String>,            // バージョン
    obsolete: Option<bool>,             // 非推奨フラグ
}
```

#### LocalVersion
git管理下のバージョン情報を保持する構造体。

```rust
// src-tauri/src/model/mod.rs
#[serde(rename_all = "camelCase")]
pub struct LocalVersion {
    pub branch_name: String,        // 現在のブランチ名
    pub last_commit_date: String,   // 最終コミット日時
}
```

---

### 1.2 TypeScript側（フロントエンド）

#### Settings / Profile / UserDataPaths
Rust側と対応する型定義。

```typescript
// src/components/atoms.tsx
type UserDataPaths = {
  root: string;
  mods: string;
  config: string;
  font: string;
  save: string;
  sound: string;
  gfx: string;
};

type Profile = {
  id: string;
  name: string;
  game_path: string;
  profile_path: UserDataPaths;
  mod_status: Mod[];
  is_active: boolean;
};

type Settings = {
  language: string;
  mod_data_path: string;
  profiles: Profile[];
};
```

#### Mod / ModInfo / LocalVersion
テーブル表示用の型定義。

```typescript
// src/components/datatable/mod-table/columns.tsx
type ModInfo = {
  id?: string;
  ident?: string;
  name?: string;
  authors: string[];
  description: string;
  category?: string;
  dependencies: string[];
  type?: string;
  maintainers?: string[];
  version?: string;
  obsolete?: boolean;
};

type LocalVersion = {
  branchName: string;
  lastCommitDate: string | null;
};

type Mod = {
  info: ModInfo;
  localVersion: LocalVersion | null;
  isInstalled: boolean;
  localPath: string;
};
```

---

### 1.3 現行のファイル構成

```
~/.catalyzer/                     # アプリデータディレクトリ
├── setting.yaml                  # Settings保存先
├── mod_data/                     # Mod保存先
│   ├── magiclysm/               # 個別Mod（gitリポジトリ）
│   ├── cata_jp/
│   └── ...
└── profiles/                     # プロファイル別データ
    ├── default_default/
    │   ├── mods/                # シンボリックリンク先
    │   ├── config/
    │   ├── save/
    │   ├── font/
    │   ├── sound/
    │   └── gfx/
    └── MyProfile_abc123/
        └── ...
```

---

## 2. 新データ構造（スナップショット方式）

VISION.mdのスナップショット設計に基づく新しいデータ構造。
**フォルダコピー方式**を採用し、シンプルで確実な保存・復元を実現する。

### 2.1 設計方針

| 項目 | 方針 |
|------|------|
| 保存方式 | **フォルダコピー**（実ファイルをそのままコピー） |
| メタデータ | `meta.yaml` にシンプルな情報のみ |
| ゲーム本体 | **保存しない**（IDのみ記録、再ダウンロード可能） |
| Mod | **フォルダごとコピー** |
| 設定・セーブ | **フォルダごとコピー** |

### 2.2 スナップショット構造体

#### SnapshotMeta（メタデータ）
スナップショットの基本情報を保持する構造体。

```rust
// 提案: src-tauri/src/snapshot/mod.rs

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SnapshotMeta {
    /// スナップショット名（ディレクトリ名としても使用）
    pub name: String,
    /// 作成日時
    pub created_at: DateTime<Utc>,
    /// ゲームバージョンID
    pub game_version_id: String,
    /// プラットフォーム
    pub platform: Platform,
    /// 説明（任意）
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum Platform {
    Windows,
    MacOS,
    Linux,
}
```

```typescript
// 提案: src/lib/types/snapshot.ts

type Platform = "windows" | "macos" | "linux";

type SnapshotMeta = {
  name: string;
  createdAt: string;  // ISO 8601形式
  gameVersionId: string;
  platform: Platform;
  description?: string;
};
```

### 2.3 スナップショット操作

#### 保存操作
現在の環境をスナップショットとして保存する。

```rust
// 提案: src-tauri/src/snapshot/commands.rs

/// スナップショットを保存
pub fn save_snapshot(name: &str, description: Option<&str>) -> Result<SnapshotMeta> {
    // 1. スナップショットディレクトリを作成
    // 2. mods/ をコピー
    // 3. config/ をコピー
    // 4. saves/ をコピー
    // 5. meta.yaml を作成
}
```

#### 復元操作
スナップショットから環境を復元する。

```rust
/// スナップショットを復元
pub fn restore_snapshot(name: &str) -> Result<()> {
    // 1. meta.yaml を読み込み
    // 2. mods/ を復元
    // 3. config/ を復元
    // 4. saves/ を復元
    // 5. ゲームバージョンを確認（必要なら再ダウンロード）
}
```

---

## 3. ファイル形式

### 3.1 スナップショットディレクトリ構成

```
~/.catalyzer/snapshots/{スナップショット名}/
├── meta.yaml           # メタデータ
├── mods/               # Modフォルダ（丸ごとコピー）
│   ├── magiclysm/
│   │   ├── modinfo.json
│   │   └── ...
│   ├── cata_jp/
│   │   ├── modinfo.json
│   │   └── ...
│   └── ...
├── config/             # 設定ファイル（丸ごとコピー）
│   ├── options.json
│   ├── keybindings.json
│   └── ...
└── saves/              # セーブデータ（丸ごとコピー）
    ├── MyWorld/
    └── ...
```

### 3.2 meta.yaml 形式

```yaml
# ~/.catalyzer/snapshots/Stable_0I_日本語環境/meta.yaml

name: "Stable 0.I + 日本語環境"
created_at: "2026-01-27T19:00:00Z"
game_version_id: "cdda-0.I-2026-01-20-1811"
platform: "macos"
description: "安定版0.Iに日本語Modを導入した環境"
```

### 3.3 全体ディレクトリ構成

```
~/.catalyzer/
├── settings.yaml                     # グローバル設定
├── active_snapshot: "Stable_0I_JP"   # 現在アクティブなスナップショット
├── cache/
│   └── games/                        # ダウンロード済みゲーム本体（再利用）
│       ├── cdda-0.I-2026-01-20-1811/
│       └── cdda-exp-2026-01-25/
└── snapshots/                        # スナップショット群
    ├── Stable_0I_日本語環境/
    │   ├── meta.yaml
    │   ├── mods/
    │   ├── config/
    │   └── saves/
    ├── Experimental_テスト用/
    │   ├── meta.yaml
    │   ├── mods/
    │   ├── config/
    │   └── saves/
    └── ...
```

---

## 4. Rust/TypeScript間のマッピング

### 4.1 シリアライズ方式

| 項目 | 方式 |
|------|------|
| Rust → JSON | serde_json + `#[serde(rename_all = "camelCase")]` |
| JSON → TypeScript | Tauri invoke経由で自動変換 |
| ファイル保存 | YAML (serde_yaml) |

### 4.2 命名規則マッピング

| Rust (snake_case) | TypeScript (camelCase) | YAML/JSON |
|-------------------|------------------------|-----------|
| `created_at` | `createdAt` | `created_at`（YAML）/ `createdAt`（JSON） |
| `game_version_id` | `gameVersionId` | `game_version_id`（YAML）|
| `last_played` | `lastPlayed` | `last_played`（YAML）|

**注意**: YAMLファイルはsnake_case、JSONレスポンスはcamelCaseで統一。

### 4.3 型変換ルール

| Rust | TypeScript | 備考 |
|------|------------|------|
| `String` | `string` | - |
| `PathBuf` | `string` | パスは文字列として扱う |
| `Option<T>` | `T \| undefined` | nullではなくundefined |
| `Vec<T>` | `T[]` | - |
| `DateTime<Utc>` | `string` | ISO 8601形式 |
| `enum` | union type | 文字列リテラルユニオン推奨 |

---

## 5. サンプルデータ

### 5.1 スナップショット例（meta.yaml）

```yaml
# Stable版で日本語Modを使用する構成

name: "Stable 0.I + 日本語環境"
created_at: "2026-01-27T19:00:00Z"
game_version_id: "cdda-0.I-2026-01-20-1811"
platform: "macos"
description: |
  安定版0.Iベースの日本語プレイ環境。
  導入Mod:
  - Magiclysm（魔法系）
  - 日本語化Mod
```

### 5.2 TypeScriptでの表現

```typescript
const snapshotMeta: SnapshotMeta = {
  name: "Stable 0.I + 日本語環境",
  createdAt: "2026-01-27T19:00:00Z",
  gameVersionId: "cdda-0.I-2026-01-20-1811",
  platform: "macos",
  description: "安定版0.Iに日本語Modを導入した環境",
};
```

### 5.3 スナップショット一覧の例

```typescript
const snapshots: SnapshotMeta[] = [
  {
    name: "Stable 0.I + 日本語環境",
    createdAt: "2026-01-27T19:00:00Z",
    gameVersionId: "cdda-0.I-2026-01-20-1811",
    platform: "macos",
    description: "メインのプレイ環境",
  },
  {
    name: "Experimental テスト",
    createdAt: "2026-01-26T10:00:00Z",
    gameVersionId: "cdda-exp-2026-01-25-0412",
    platform: "macos",
    description: "最新機能のテスト用",
  },
];
```

---

## 6. 移行パス

### 6.1 現行 → 新構造への移行

```
現行Profile                    新Snapshot
───────────                   ──────────
id                    →       （不要、name がキー）
name                  →       name（ディレクトリ名）
game_path             →       game_version_id（IDに変換）
profile_path.mods     →       mods/（フォルダコピー）
profile_path.config   →       config/（フォルダコピー）
profile_path.save     →       saves/（フォルダコピー）
mod_status            →       （不要、mods/ の中身から取得）
is_active             →       settings.yaml の active_snapshot
```

### 6.2 移行手順

1. **Phase 1**: 新Snapshot機能を追加（現行と共存）
2. **Phase 2**: 移行ツールで既存ProfileをSnapshotに変換
3. **Phase 3**: UIを新構造に対応
4. **Phase 4**: 旧Profile構造を段階的に廃止

### 6.3 後方互換性

- 移行期間中は旧setting.yamlを読み取り可能
- 新形式で保存後は旧形式に戻せない（一方向移行）

---

## 7. 容量見積もり

| 項目 | サイズ目安 | 保存方針 |
|------|-----------|----------|
| ゲーム本体 | 500MB〜1GB | **保存しない**（キャッシュから再利用） |
| Mod（1つあたり） | 1MB〜50MB | フォルダコピー |
| 設定ファイル | 数KB〜数MB | フォルダコピー |
| セーブデータ | 数MB〜数十MB | フォルダコピー |
| **1スナップショット合計** | 10MB〜200MB | - |

**注記**: ゲーム本体を保存しないことで、大幅な容量節約を実現。

---

## 変更履歴

| 日付 | 版 | 内容 |
|------|-----|------|
| 2026-01-27 | v1.0 | 初版作成 |
| 2026-01-27 | v1.1 | フォルダコピー方式に変更、日本語化 |
