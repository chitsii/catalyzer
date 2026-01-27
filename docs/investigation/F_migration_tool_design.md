# 移行ツール設計書

> **作成日**: 2026-01-27
> **担当**: 足軽6号（シニアソフトウェアエンジニアとして）
> **ステータス**: ドラフト
> **関連ドキュメント**: [MIGRATION.md](../MIGRATION.md), [DATA_STRUCTURE.md](../DATA_STRUCTURE.md)

---

## 1. Profile → Snapshot 変換アルゴリズム

### 1.1 フィールドマッピング

| Profile フィールド | Snapshot フィールド | 変換ルール |
|-------------------|---------------------|------------|
| `id` | (削除) | Snapshotでは`name`がキーとなるため不要 |
| `name` | `name` | そのままコピー（ディレクトリ名として使用） |
| `game_path` | `game_version_id` | パスからバージョンIDを抽出（後述） |
| `profile_path.mods` | `mods/` | シンボリックリンク解決後、実体をコピー |
| `profile_path.config` | `config/` | フォルダごとコピー |
| `profile_path.save` | `saves/` | フォルダごとコピー |
| `profile_path.font` | (削除) | ゲーム本体に含まれるため不要 |
| `profile_path.sound` | (削除) | ゲーム本体に含まれるため不要 |
| `profile_path.gfx` | (削除) | ゲーム本体に含まれるため不要 |
| `mod_status` | (削除) | `mods/`内のmodinfo.jsonから動的に取得 |
| `is_active` | `settings.yaml` | アクティブなプロファイルは`active_snapshot`に設定 |

### 1.2 game_version_id 抽出アルゴリズム

```rust
/// game_pathからgame_version_idを抽出する
///
/// # 入力例
/// - "/Applications/Cataclysm.app" → バージョンファイルから取得
/// - "C:\Games\cdda-0.I-2026-01-20\" → ディレクトリ名から抽出
///
/// # 出力例
/// - "cdda-0.I-2026-01-20-1811"
/// - "cdda-exp-2026-01-25-0412"
fn extract_game_version_id(game_path: &Path) -> Result<String, MigrationError> {
    // 方法1: VERSION.txt または VERSION ファイルから取得
    let version_file = game_path.join("VERSION.txt");
    if version_file.exists() {
        let content = fs::read_to_string(&version_file)?;
        return parse_version_string(&content);
    }

    // 方法2: data/changelog.txt の先頭から取得
    let changelog = game_path.join("data/changelog.txt");
    if changelog.exists() {
        let content = fs::read_to_string(&changelog)?;
        if let Some(first_line) = content.lines().next() {
            return parse_version_from_changelog(first_line);
        }
    }

    // 方法3: ディレクトリ名から推測
    if let Some(dir_name) = game_path.file_name() {
        let name = dir_name.to_string_lossy();
        if name.contains("cdda") || name.contains("cataclysm") {
            return Ok(sanitize_version_id(&name));
        }
    }

    // フォールバック: 不明なバージョン
    Err(MigrationError::UnknownGameVersion {
        path: game_path.to_path_buf(),
        suggestion: "手動でゲームバージョンを指定してください".to_string(),
    })
}
```

### 1.3 Modシンボリックリンク解決

現行システムではModがシンボリックリンクとして管理されている場合がある。

```rust
/// シンボリックリンクを解決して実体をコピーする
fn resolve_and_copy_mods(
    source_mods_path: &Path,
    target_mods_path: &Path,
) -> Result<Vec<ModCopyResult>, MigrationError> {
    let mut results = Vec::new();

    for entry in fs::read_dir(source_mods_path)? {
        let entry = entry?;
        let path = entry.path();

        let real_path = if path.is_symlink() {
            // シンボリックリンクを解決
            fs::canonicalize(&path)?
        } else {
            path.clone()
        };

        if real_path.is_dir() {
            let mod_name = path.file_name()
                .ok_or(MigrationError::InvalidPath)?
                .to_string_lossy()
                .to_string();

            let target = target_mods_path.join(&mod_name);

            // ディレクトリごとコピー
            copy_dir_recursive(&real_path, &target)?;

            results.push(ModCopyResult {
                mod_name,
                source: real_path,
                target,
                was_symlink: path.is_symlink(),
            });
        }
    }

    Ok(results)
}
```

### 1.4 デフォルト値の扱い

| フィールド | 値がない場合のデフォルト |
|-----------|-------------------------|
| `description` | `None`（空のまま） |
| `platform` | 実行環境から自動検出 |
| `created_at` | 移行実行時のタイムスタンプ |
| `game_version_id` | `"unknown-version"` + 警告表示 |

```rust
fn get_default_platform() -> Platform {
    #[cfg(target_os = "windows")]
    return Platform::Windows;

    #[cfg(target_os = "macos")]
    return Platform::MacOS;

    #[cfg(target_os = "linux")]
    return Platform::Linux;
}
```

---

## 2. 移行プロセス設計

### 2.1 ステップバイステップ処理フロー

```
┌─────────────────────────────────────────────────────────────┐
│                    移行プロセス全体図                        │
└─────────────────────────────────────────────────────────────┘

[開始]
   │
   ▼
┌──────────────────────┐
│ Step 1: 事前チェック  │
│ - ディスク容量確認    │
│ - Profileの整合性検証 │
│ - 書き込み権限確認    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Step 2: バックアップ  │
│ - 現行データの退避    │
│ - バックアップ検証    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Step 3: 変換準備      │
│ - 出力ディレクトリ作成│
│ - 一時ファイル準備    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ Step 4: Profile毎の変換ループ            │
│ ┌──────────────────────────────────────┐ │
│ │ 4.1: meta.yaml 生成                  │ │
│ ├──────────────────────────────────────┤ │
│ │ 4.2: mods/ コピー（シンボリンク解決）│ │
│ ├──────────────────────────────────────┤ │
│ │ 4.3: config/ コピー                  │ │
│ ├──────────────────────────────────────┤ │
│ │ 4.4: saves/ コピー                   │ │
│ ├──────────────────────────────────────┤ │
│ │ 4.5: 変換結果の検証                  │ │
│ └──────────────────────────────────────┘ │
│           ↓ 次のProfile                  │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│ Step 5: 設定ファイル  │
│ - settings.yaml更新   │
│ - active_snapshot設定 │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Step 6: クリーンアップ│
│ - 一時ファイル削除    │
│ - 移行完了マーク      │
└──────────┬───────────┘
           │
           ▼
[完了]
```

### 2.2 トランザクション境界

移行処理はアトミック性を保証するため、以下のトランザクション境界を設ける。

```rust
/// 移行トランザクションの状態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationTransaction {
    /// トランザクションID
    pub id: String,
    /// 開始時刻
    pub started_at: DateTime<Utc>,
    /// 現在のステップ
    pub current_step: MigrationStep,
    /// 処理済みProfile
    pub completed_profiles: Vec<String>,
    /// 失敗したProfile
    pub failed_profiles: Vec<FailedProfile>,
    /// バックアップパス
    pub backup_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MigrationStep {
    NotStarted,
    PreCheck,
    Backup,
    Converting { profile_index: usize, total: usize },
    Finalizing,
    Completed,
    RolledBack,
}

/// トランザクションファイルのパス
/// ~/.catalyzer/.migration_transaction.yaml
const TRANSACTION_FILE: &str = ".migration_transaction.yaml";
```

**トランザクション保証の仕組み**:

1. **開始時**: トランザクションファイルを作成
2. **各ステップ完了時**: トランザクションファイルを更新
3. **異常終了時**: 次回起動時にトランザクションファイルを検出→復旧処理
4. **正常完了時**: トランザクションファイルを削除

```rust
impl MigrationTransaction {
    /// トランザクションを開始
    pub fn begin(profiles: &[Profile], backup_path: PathBuf) -> Result<Self> {
        let transaction = Self {
            id: Uuid::new_v4().to_string(),
            started_at: Utc::now(),
            current_step: MigrationStep::NotStarted,
            completed_profiles: Vec::new(),
            failed_profiles: Vec::new(),
            backup_path,
        };
        transaction.persist()?;
        Ok(transaction)
    }

    /// 進捗を保存
    fn persist(&self) -> Result<()> {
        let path = get_catalyzer_dir()?.join(TRANSACTION_FILE);
        let yaml = serde_yaml::to_string(self)?;
        fs::write(&path, yaml)?;
        Ok(())
    }

    /// トランザクションをコミット（完了）
    pub fn commit(mut self) -> Result<()> {
        self.current_step = MigrationStep::Completed;
        let path = get_catalyzer_dir()?.join(TRANSACTION_FILE);
        fs::remove_file(&path)?;
        Ok(())
    }

    /// 未完了のトランザクションを検出
    pub fn find_incomplete() -> Option<Self> {
        let path = get_catalyzer_dir().ok()?.join(TRANSACTION_FILE);
        if path.exists() {
            let content = fs::read_to_string(&path).ok()?;
            serde_yaml::from_str(&content).ok()
        } else {
            None
        }
    }
}
```

### 2.3 並列処理設計

Profile間の変換は独立しているため、並列処理が可能。

```rust
use rayon::prelude::*;

/// 複数Profileを並列で変換（CPU数に応じて自動調整）
fn convert_profiles_parallel(
    profiles: &[Profile],
    output_dir: &Path,
    progress_tx: Sender<MigrationProgress>,
) -> Vec<Result<SnapshotMeta, MigrationError>> {
    profiles
        .par_iter()
        .enumerate()
        .map(|(index, profile)| {
            let result = convert_single_profile(profile, output_dir);

            // 進捗報告
            let _ = progress_tx.send(MigrationProgress {
                current: index + 1,
                total: profiles.len(),
                profile_name: profile.name.clone(),
                status: if result.is_ok() { "success" } else { "failed" },
            });

            result
        })
        .collect()
}
```

**要検討**: 並列処理時のI/O競合について
- 同一HDDへの書き込みは並列化してもボトルネックになる可能性
- SSD環境では効果が期待できる
- 設定で並列度を調整可能にするか検討が必要

---

## 3. ロールバック設計

### 3.1 バックアップ戦略

```
~/.catalyzer/
├── backup/                              # バックアップディレクトリ
│   └── {timestamp}/                     # タイムスタンプ付きディレクトリ
│       ├── backup_manifest.yaml         # バックアップ内容の一覧
│       ├── setting.yaml                 # 旧設定ファイル
│       └── profiles/                    # 旧プロファイルデータ
│           ├── default_default/
│           └── MyProfile_abc123/
```

**backup_manifest.yaml**:
```yaml
# バックアップマニフェスト
version: "1.0"
created_at: "2026-01-27T19:00:00Z"
migration_id: "550e8400-e29b-41d4-a716-446655440000"
source_version: "profile-based"
target_version: "snapshot-based"

backed_up_items:
  - type: file
    path: setting.yaml
    size_bytes: 1024
    checksum_sha256: "abc123..."

  - type: directory
    path: profiles/default_default
    size_bytes: 52428800
    file_count: 150
    checksum_sha256: "def456..."  # ディレクトリ全体のハッシュ
```

### 3.2 ロールバック処理フロー

```rust
/// ロールバック処理
pub async fn rollback_migration(
    backup_path: &Path,
) -> Result<RollbackResult, RollbackError> {
    // Step 1: バックアップの整合性検証
    let manifest = load_and_verify_manifest(backup_path)?;

    // Step 2: 現在の（不完全な）移行データを退避
    let temp_dir = create_temp_evacuation_dir()?;

    // Step 3: バックアップから復元
    for item in &manifest.backed_up_items {
        match item.item_type {
            BackupItemType::File => {
                restore_file(backup_path, item, &get_catalyzer_dir()?)?;
            }
            BackupItemType::Directory => {
                restore_directory(backup_path, item, &get_catalyzer_dir()?)?;
            }
        }

        // チェックサム検証
        verify_checksum(item)?;
    }

    // Step 4: 検証
    verify_restored_data()?;

    // Step 5: 退避データを削除
    fs::remove_dir_all(&temp_dir)?;

    Ok(RollbackResult {
        restored_profiles: manifest.backed_up_items.len(),
        backup_used: backup_path.to_path_buf(),
    })
}
```

### 3.3 失敗時のリカバリーパターン

| 失敗タイミング | 状態 | リカバリー方法 |
|---------------|------|----------------|
| バックアップ作成中 | 旧データ健全 | バックアップ破棄、再試行 |
| 変換処理中（一部完了） | 混在状態 | 自動ロールバック |
| 設定ファイル更新中 | Snapshot作成済み | 設定のみ修復 |
| クリーンアップ中 | ほぼ完了 | 手動クリーンアップ |

```rust
/// 起動時の自動リカバリー
pub fn check_and_recover_on_startup() -> Result<RecoveryAction> {
    if let Some(transaction) = MigrationTransaction::find_incomplete() {
        match transaction.current_step {
            MigrationStep::NotStarted | MigrationStep::PreCheck => {
                // 開始前なら何もしない
                cleanup_transaction_file()?;
                Ok(RecoveryAction::None)
            }
            MigrationStep::Backup => {
                // バックアップ中断→バックアップ破棄
                if transaction.backup_path.exists() {
                    fs::remove_dir_all(&transaction.backup_path)?;
                }
                cleanup_transaction_file()?;
                Ok(RecoveryAction::BackupCleaned)
            }
            MigrationStep::Converting { .. } => {
                // 変換中断→ロールバック実行
                rollback_migration(&transaction.backup_path)?;
                cleanup_transaction_file()?;
                Ok(RecoveryAction::RolledBack)
            }
            MigrationStep::Finalizing => {
                // 最終処理中断→部分復旧
                repair_settings_file(&transaction)?;
                Ok(RecoveryAction::Repaired)
            }
            _ => Ok(RecoveryAction::None),
        }
    } else {
        Ok(RecoveryAction::None)
    }
}
```

---

## 4. バリデーション設計

### 4.1 移行前チェック

```rust
/// 移行前の検証項目
#[derive(Debug)]
pub struct PreMigrationCheck {
    pub disk_space: DiskSpaceCheck,
    pub profile_validity: Vec<ProfileValidityCheck>,
    pub permissions: PermissionCheck,
    pub conflicts: ConflictCheck,
}

/// 事前チェックを実行
pub fn run_pre_migration_checks(
    profiles: &[Profile],
) -> Result<PreMigrationCheck, Vec<PreCheckError>> {
    let mut errors = Vec::new();

    // 1. ディスク容量チェック
    let disk_space = check_disk_space(profiles);
    if !disk_space.is_sufficient {
        errors.push(PreCheckError::InsufficientDiskSpace {
            required: disk_space.required_bytes,
            available: disk_space.available_bytes,
        });
    }

    // 2. Profile整合性チェック
    let profile_checks: Vec<_> = profiles
        .iter()
        .map(|p| check_profile_validity(p))
        .collect();

    for check in &profile_checks {
        if !check.is_valid {
            errors.push(PreCheckError::InvalidProfile {
                profile_name: check.profile_name.clone(),
                issues: check.issues.clone(),
            });
        }
    }

    // 3. 書き込み権限チェック
    let permissions = check_write_permissions();
    if !permissions.can_write {
        errors.push(PreCheckError::PermissionDenied {
            paths: permissions.denied_paths.clone(),
        });
    }

    // 4. 名前衝突チェック
    let conflicts = check_name_conflicts(profiles);
    if !conflicts.conflicts.is_empty() {
        errors.push(PreCheckError::NameConflict {
            conflicts: conflicts.conflicts.clone(),
        });
    }

    if errors.is_empty() {
        Ok(PreMigrationCheck {
            disk_space,
            profile_validity: profile_checks,
            permissions,
            conflicts,
        })
    } else {
        Err(errors)
    }
}

/// ディスク容量の計算
fn check_disk_space(profiles: &[Profile]) -> DiskSpaceCheck {
    let mut total_required: u64 = 0;

    for profile in profiles {
        // mods, config, saves の合計サイズを計算
        total_required += calculate_dir_size(&profile.profile_path.mods);
        total_required += calculate_dir_size(&profile.profile_path.config);
        total_required += calculate_dir_size(&profile.profile_path.save);
    }

    // バックアップ用に2倍必要
    total_required *= 2;

    // 余裕を持って10%追加
    total_required = (total_required as f64 * 1.1) as u64;

    let available = get_available_disk_space();

    DiskSpaceCheck {
        required_bytes: total_required,
        available_bytes: available,
        is_sufficient: available > total_required,
    }
}
```

### 4.2 移行後検証

```rust
/// 移行後の検証
pub fn verify_migration(
    original_profiles: &[Profile],
    created_snapshots: &[SnapshotMeta],
) -> MigrationVerificationResult {
    let mut results = Vec::new();

    for (profile, snapshot) in original_profiles.iter().zip(created_snapshots.iter()) {
        let verification = SnapshotVerification {
            snapshot_name: snapshot.name.clone(),
            checks: vec![
                // meta.yaml の存在確認
                check_meta_yaml_exists(snapshot),

                // Mod数の一致確認
                check_mod_count_matches(profile, snapshot),

                // 設定ファイルの存在確認
                check_config_files_exist(snapshot),

                // セーブデータの整合性確認
                check_saves_integrity(profile, snapshot),

                // ファイルサイズの妥当性確認
                check_file_sizes(profile, snapshot),
            ],
        };

        results.push(verification);
    }

    MigrationVerificationResult {
        all_passed: results.iter().all(|r| r.is_all_passed()),
        verifications: results,
    }
}

/// Mod数の一致確認
fn check_mod_count_matches(
    profile: &Profile,
    snapshot: &SnapshotMeta,
) -> VerificationCheck {
    let original_count = count_mods_in_dir(&profile.profile_path.mods);
    let snapshot_count = count_mods_in_snapshot(&snapshot.name);

    VerificationCheck {
        name: "mod_count".to_string(),
        passed: original_count == snapshot_count,
        message: if original_count == snapshot_count {
            format!("Mod数一致: {}", original_count)
        } else {
            format!(
                "Mod数不一致: 元={}, 移行後={}",
                original_count, snapshot_count
            )
        },
    }
}
```

### 4.3 検証チェックリスト

| カテゴリ | チェック項目 | 重要度 |
|---------|-------------|--------|
| **ファイル** | meta.yaml が存在する | 必須 |
| **ファイル** | mods/ ディレクトリが存在する | 必須 |
| **ファイル** | config/ ディレクトリが存在する | 必須 |
| **ファイル** | saves/ ディレクトリが存在する | 必須 |
| **整合性** | Mod数が一致する | 必須 |
| **整合性** | 各Modにmodinfo.jsonがある | 必須 |
| **整合性** | セーブデータのファイル数が一致 | 重要 |
| **サイズ** | 総ファイルサイズが妥当（±5%以内） | 重要 |
| **メタデータ** | game_version_idが有効 | 重要 |
| **メタデータ** | platformが正しい | 重要 |

---

## 5. UI/UX設計

### 5.1 移行ウィザード画面フロー

```
┌─────────────────────────────────────────────────────────────┐
│                     移行ウィザード                          │
└─────────────────────────────────────────────────────────────┘

[Step 1: 移行の説明]
┌─────────────────────────────────────────────────────────────┐
│  🔄 データ移行のご案内                                      │
│                                                             │
│  Catalyzerは新しいデータ形式に移行します。                  │
│                                                             │
│  ✓ より分かりやすい環境管理                                 │
│  ✓ ワンクリックで保存・復元                                 │
│  ✓ gitの知識が不要に                                        │
│                                                             │
│  移行前に自動でバックアップを作成します。                   │
│  安心して移行を進めてください。                             │
│                                                             │
│              [キャンセル]  [次へ →]                         │
└─────────────────────────────────────────────────────────────┘

                            ↓

[Step 2: 移行対象の確認]
┌─────────────────────────────────────────────────────────────┐
│  📋 移行対象のプロファイル                                  │
│                                                             │
│  以下のプロファイルを移行します：                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Default Profile                                   │   │
│  │   Mods: 12個 | Save: 3個 | サイズ: 45MB            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ☑ 日本語環境                                        │   │
│  │   Mods: 8個 | Save: 1個 | サイズ: 32MB             │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ☑ Experimental Test                                 │   │
│  │   Mods: 15個 | Save: 5個 | サイズ: 78MB            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  必要な空き容量: 約 350MB                                   │
│  利用可能な容量: 50GB ✓                                     │
│                                                             │
│              [← 戻る]  [移行を開始 →]                       │
└─────────────────────────────────────────────────────────────┘

                            ↓

[Step 3: 移行進行中]
┌─────────────────────────────────────────────────────────────┐
│  ⏳ 移行を実行しています...                                 │
│                                                             │
│  ████████████████░░░░░░░░░░░░░░ 45%                        │
│                                                             │
│  現在の処理: 日本語環境 のModをコピー中...                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ Default Profile              完了                 │   │
│  │ ⏳ 日本語環境                   処理中...           │   │
│  │ ○ Experimental Test            待機中               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ※ 処理中はアプリを終了しないでください                     │
│                                                             │
│                        [キャンセル]                         │
└─────────────────────────────────────────────────────────────┘

                            ↓

[Step 4: 完了]
┌─────────────────────────────────────────────────────────────┐
│  ✅ 移行が完了しました！                                    │
│                                                             │
│  3つのプロファイルを正常に移行しました。                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 移行結果:                                           │   │
│  │ ✓ Default Profile → "Default Profile"              │   │
│  │ ✓ 日本語環境 → "日本語環境"                         │   │
│  │ ✓ Experimental Test → "Experimental Test"          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  バックアップは30日間保持されます。                         │
│  場所: ~/.catalyzer/backup/2026-01-27_190000/              │
│                                                             │
│                          [完了]                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 プログレス表示

```typescript
// src/components/migration/MigrationProgress.tsx

type MigrationProgressProps = {
  currentStep: number;
  totalSteps: number;
  currentProfile: string;
  currentAction: string;
  profileResults: ProfileMigrationResult[];
};

type ProfileMigrationResult = {
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  error?: string;
};

// プログレスバーの計算
function calculateProgress(
  currentStep: number,
  totalSteps: number,
  subProgress: number  // 0-100
): number {
  const stepWeight = 100 / totalSteps;
  const completedWeight = currentStep * stepWeight;
  const currentStepProgress = (subProgress / 100) * stepWeight;
  return Math.min(completedWeight + currentStepProgress, 100);
}
```

### 5.3 エラー表示

```
[エラー発生時の画面]
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ 移行中にエラーが発生しました                            │
│                                                             │
│  「日本語環境」の移行に失敗しました。                       │
│                                                             │
│  エラー内容:                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ディスク容量が不足しています。                       │   │
│  │ 必要: 50MB / 利用可能: 10MB                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  対処方法:                                                  │
│  1. 不要なファイルを削除して空き容量を確保                  │
│  2. 「再試行」をクリックして移行を続行                      │
│                                                             │
│  または「ロールバック」で元の状態に戻せます。               │
│                                                             │
│        [ロールバック]  [スキップ]  [再試行]                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Tauriコマンド設計

```rust
// src-tauri/src/commands/migration.rs

/// 移行の事前チェック
#[tauri::command]
pub async fn check_migration_readiness() -> Result<MigrationReadiness, String> {
    run_pre_migration_checks(&get_profiles()?)
        .map_err(|e| format!("{:?}", e))
}

/// 移行を開始
#[tauri::command]
pub async fn start_migration(
    window: tauri::Window,
) -> Result<MigrationResult, String> {
    let profiles = get_profiles()?;

    // 進捗をフロントエンドに通知
    let (tx, mut rx) = tokio::sync::mpsc::channel(100);

    tokio::spawn(async move {
        while let Some(progress) = rx.recv().await {
            let _ = window.emit("migration-progress", progress);
        }
    });

    execute_migration(&profiles, tx).await
        .map_err(|e| format!("{:?}", e))
}

/// 移行をロールバック
#[tauri::command]
pub async fn rollback_migration(
    backup_path: String,
) -> Result<RollbackResult, String> {
    crate::migration::rollback_migration(Path::new(&backup_path))
        .await
        .map_err(|e| format!("{:?}", e))
}

/// 移行状態を確認（中断からの復帰用）
#[tauri::command]
pub async fn check_migration_state() -> Option<MigrationTransaction> {
    MigrationTransaction::find_incomplete()
}
```

### 5.5 フロントエンド実装例

```typescript
// src/hooks/useMigration.ts

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type MigrationProgress = {
  current: number;
  total: number;
  profileName: string;
  action: string;
  percentage: number;
};

export function useMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 進捗イベントをリッスン
    const unlisten = listen<MigrationProgress>(
      "migration-progress",
      (event) => {
        setProgress(event.payload);
      }
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const startMigration = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await invoke<MigrationResult>("start_migration");
      return result;
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setIsRunning(false);
    }
  };

  const rollback = async (backupPath: string) => {
    try {
      await invoke("rollback_migration", { backupPath });
    } catch (e) {
      setError(String(e));
      throw e;
    }
  };

  return {
    isRunning,
    progress,
    error,
    startMigration,
    rollback,
  };
}
```

---

## 6. 要検討事項

以下の項目は設計段階で確定できず、実装時または上位判断が必要：

| 項目 | 内容 | 推奨案 |
|------|------|--------|
| 並列処理の有効化 | 複数Profileの同時変換 | SSD環境のみ有効、設定で切替可能に |
| バックアップ保持期間 | デフォルト値 | 30日（設定で変更可能） |
| 部分失敗時の挙動 | 一部Profile失敗時 | 成功分は保持、失敗分のみリトライ可能に |
| 自動移行 vs 手動移行 | デフォルトの挙動 | 自動移行を推奨、手動も選択可能 |
| 移行中のアプリ終了 | 強制終了時の挙動 | 次回起動時に自動リカバリー |

---

## 変更履歴

| 日付 | 版 | 内容 |
|------|-----|------|
| 2026-01-27 | v1.0 | 初版作成 |
