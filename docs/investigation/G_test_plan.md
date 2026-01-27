# Catalyzer テスト計画書

> **最終更新**: 2026-01-27
> **ステータス**: ドラフト
> **関連ドキュメント**: [ARCHITECTURE.md](../ARCHITECTURE.md), [DATA_STRUCTURE.md](../DATA_STRUCTURE.md), [MIGRATION.md](../MIGRATION.md)

---

## 1. テスト戦略概要

### 1.1 テストピラミッド

```
                    ┌─────────┐
                    │  E2E    │  ← 少数・重要フローのみ
                   ─┴─────────┴─
                  ┌─────────────┐
                  │  統合テスト  │  ← API境界・コンポーネント連携
                ─┴───────────────┴─
              ┌─────────────────────┐
              │    ユニットテスト    │  ← 大量・高速・ロジック検証
            ─┴───────────────────────┴─
```

| レイヤー | 割合目安 | 実行頻度 | 主な対象 |
|----------|----------|----------|----------|
| ユニット | 70% | 毎コミット | 関数、モジュール、コンポーネント |
| 統合 | 20% | PR時 | Tauri IPC、状態管理、ファイルI/O |
| E2E | 10% | リリース前 | 主要ユースケース |

### 1.2 カバレッジ目標

| 領域 | 目標カバレッジ | 理由 |
|------|----------------|------|
| Rust バックエンド（コア） | 80% | ファイル操作・データ変換が多く、バグの影響が大きい |
| Rust バックエンド（I/O） | 60% | 外部依存が多く、モック化が必要 |
| フロントエンド（ロジック） | 70% | 状態管理・データ変換のロジック |
| フロントエンド（UI） | 50% | ビジュアルリグレッションは別途対応 |

### 1.3 テスト環境

| 環境 | OS | 用途 |
|------|-----|------|
| ローカル開発 | macOS / Windows | 開発者の日常テスト |
| CI (GitHub Actions) | ubuntu-latest, macos-latest, windows-latest | 自動テスト |
| ステージング | macOS + Windows実機 | リリース前手動テスト |

---

## 2. ユニットテスト設計

### 2.1 Rust側テスト

#### 2.1.1 テスト対象モジュール

| モジュール | ファイル | テスト項目 | 優先度 |
|------------|----------|------------|--------|
| **profile** | `src-tauri/src/profile/mod.rs` | Settings読み書き、Profile CRUD | 高 |
| **snapshot** | `src-tauri/src/snapshot/mod.rs` (新規) | スナップショット保存/復元/削除 | 高 |
| **files** | `src-tauri/src/files/` | シンボリックリンク操作、パス解決 | 高 |
| **cdda** | `src-tauri/src/cdda/` | リリース情報取得、ゲーム起動 | 中 |
| **model** | `src-tauri/src/model/mod.rs` | Mod情報パース、型変換 | 中 |
| **zip** | `src-tauri/src/zip/mod.rs` | Zip展開処理 | 低 |
| **dmg** | `src-tauri/src/dmg/mod.rs` | DMG展開処理（macOSのみ） | 低 |

#### 2.1.2 profile モジュールのテストケース

```rust
// テストケース例: src-tauri/src/profile/mod.rs

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    // Settings テスト
    #[test]
    fn test_settings_default_values() {
        // デフォルト値が正しく設定されること
    }

    #[test]
    fn test_settings_save_and_load() {
        // 保存したSettingsが正しく読み込めること
    }

    #[test]
    fn test_settings_invalid_yaml_handling() {
        // 不正なYAMLファイルでエラーを返すこと
    }

    // Profile テスト
    #[test]
    fn test_add_profile() {
        // プロファイル追加が正しく動作すること
    }

    #[test]
    fn test_add_profile_duplicate_name() {
        // 重複名でエラーを返すこと
    }

    #[test]
    fn test_remove_profile() {
        // プロファイル削除が正しく動作すること
    }

    #[test]
    fn test_remove_active_profile() {
        // アクティブプロファイル削除時の挙動
    }

    #[test]
    fn test_set_profile_active() {
        // アクティブプロファイル切替が正しく動作すること
    }
}
```

#### 2.1.3 snapshot モジュールのテストケース（新規）

```rust
// テストケース例: src-tauri/src/snapshot/mod.rs

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    // スナップショット作成テスト
    #[test]
    fn test_create_snapshot_basic() {
        // 基本的なスナップショット作成
    }

    #[test]
    fn test_create_snapshot_with_saves() {
        // セーブデータを含むスナップショット作成
    }

    #[test]
    fn test_create_snapshot_without_saves() {
        // セーブデータを除外したスナップショット作成
    }

    #[test]
    fn test_create_snapshot_name_sanitization() {
        // 特殊文字を含む名前のサニタイズ
    }

    #[test]
    fn test_create_snapshot_duplicate_name() {
        // 重複名でエラーを返すこと
    }

    // スナップショット復元テスト
    #[test]
    fn test_restore_snapshot_basic() {
        // 基本的な復元処理
    }

    #[test]
    fn test_restore_snapshot_nonexistent() {
        // 存在しないスナップショットでエラー
    }

    #[test]
    fn test_restore_snapshot_preserves_current() {
        // 復元失敗時に現在の状態を保持
    }

    // スナップショット削除テスト
    #[test]
    fn test_delete_snapshot() {
        // スナップショット削除が正しく動作
    }

    #[test]
    fn test_delete_active_snapshot() {
        // アクティブなスナップショットは削除不可
    }

    // 容量計算テスト
    #[test]
    fn test_calculate_snapshot_size() {
        // サイズ計算の正確性
    }

    // メタデータテスト
    #[test]
    fn test_meta_yaml_serialization() {
        // meta.yamlの正しいシリアライズ
    }

    #[test]
    fn test_meta_yaml_deserialization() {
        // meta.yamlの正しいデシリアライズ
    }
}
```

#### 2.1.4 files モジュールのテストケース

```rust
// テストケース例: src-tauri/src/files/mod.rs

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    // シンボリックリンク操作
    #[test]
    fn test_create_symlink() {
        // シンボリックリンク作成
    }

    #[test]
    fn test_create_symlink_target_not_exists() {
        // 存在しないターゲットへのリンク作成失敗
    }

    #[test]
    fn test_remove_symlink() {
        // シンボリックリンク削除
    }

    #[test]
    fn test_is_symlink() {
        // シンボリックリンク判定
    }

    // フォルダコピー操作（スナップショット用）
    #[test]
    fn test_copy_directory_recursive() {
        // ディレクトリの再帰コピー
    }

    #[test]
    fn test_copy_directory_preserves_structure() {
        // ディレクトリ構造の保持
    }

    #[test]
    fn test_copy_directory_handles_symlinks() {
        // シンボリックリンクの扱い
    }
}
```

#### 2.1.5 model モジュールのテストケース

```rust
// テストケース例: src-tauri/src/model/mod.rs

#[cfg(test)]
mod tests {
    use super::*;

    // ModInfo パーステスト
    #[test]
    fn test_parse_modinfo_new_format() {
        // 新形式（ident使用）のmodinfo.json
    }

    #[test]
    fn test_parse_modinfo_old_format() {
        // 旧形式（id使用）のmodinfo.json
    }

    #[test]
    fn test_parse_modinfo_minimal() {
        // 最小限の必須フィールドのみ
    }

    #[test]
    fn test_parse_modinfo_full() {
        // 全フィールドが含まれる場合
    }

    #[test]
    fn test_parse_modinfo_invalid_json() {
        // 不正なJSONでエラー
    }

    // StringOrVec テスト
    #[test]
    fn test_string_or_vec_single() {
        // 単一文字列のデシリアライズ
    }

    #[test]
    fn test_string_or_vec_array() {
        // 配列のデシリアライズ
    }
}
```

### 2.2 フロントエンド（TypeScript/React）テスト

#### 2.2.1 テスト対象

| 分類 | ファイル/ディレクトリ | テスト項目 | 優先度 |
|------|----------------------|------------|--------|
| **状態管理** | `src/components/atoms.tsx` | Jotai atoms の初期値・更新 | 高 |
| **APIラッパー** | `src/lib/api.ts` | Tauri invoke呼び出し | 高 |
| **ユーティリティ** | `src/lib/` | ヘルパー関数 | 中 |
| **コンポーネント** | `src/components/` | 表示・インタラクション | 中 |
| **hooks** | `src/components/` | カスタムフック | 中 |

#### 2.2.2 状態管理（atoms.tsx）のテストケース

```typescript
// テストケース例: src/components/atoms.test.tsx

import { renderHook, act } from '@testing-library/react';
import { useAtom } from 'jotai';
import { settingsAtom, activeProfileAtom } from './atoms';

describe('atoms', () => {
  describe('settingsAtom', () => {
    it('should have default values', () => {
      // デフォルト値のテスト
    });

    it('should update settings correctly', () => {
      // 設定更新のテスト
    });
  });

  describe('activeProfileAtom', () => {
    it('should return active profile from settings', () => {
      // アクティブプロファイル取得
    });

    it('should return null when no active profile', () => {
      // アクティブプロファイルなしの場合
    });
  });
});
```

#### 2.2.3 APIラッパー（api.ts）のテストケース

```typescript
// テストケース例: src/lib/api.test.ts

import { getSettings, addProfile, createSnapshot } from './api';
import { invoke } from '@tauri-apps/api/core';

// Tauri invokeをモック
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should call invoke with correct command', async () => {
      // 正しいコマンドで呼び出されること
    });

    it('should return settings on success', async () => {
      // 成功時に設定を返すこと
    });

    it('should throw error on failure', async () => {
      // 失敗時にエラーをスローすること
    });
  });

  describe('createSnapshot', () => {
    it('should call invoke with name and options', async () => {
      // 正しい引数で呼び出されること
    });

    it('should handle include_saves option', async () => {
      // include_savesオプションの処理
    });
  });
});
```

#### 2.2.4 コンポーネントテスト

```typescript
// テストケース例: src/components/profile-switcher.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileSwitcher } from './profile-switcher';

describe('ProfileSwitcher', () => {
  const mockProfiles = [
    { id: '1', name: 'Profile 1', is_active: true },
    { id: '2', name: 'Profile 2', is_active: false },
  ];

  it('should render profile list', () => {
    // プロファイル一覧の表示
  });

  it('should highlight active profile', () => {
    // アクティブプロファイルのハイライト
  });

  it('should call onSelect when profile clicked', () => {
    // クリック時のコールバック
  });

  it('should show create button', () => {
    // 作成ボタンの表示
  });
});
```

### 2.3 テストツール・ライブラリ

| 領域 | ツール | 用途 |
|------|--------|------|
| Rust ユニット | 標準テストフレームワーク | 基本テスト |
| Rust モック | `mockall` | 外部依存のモック |
| Rust 一時ファイル | `tempfile` | テスト用一時ディレクトリ |
| TS/React | `vitest` or `jest` | テストランナー |
| React コンポーネント | `@testing-library/react` | コンポーネントテスト |
| モック | `jest.mock` / `vi.mock` | Tauri APIモック |

---

## 3. 統合テスト設計

### 3.1 Tauri API テスト

#### 3.1.1 テスト対象コマンド

| コマンド | カテゴリ | テスト内容 |
|----------|----------|------------|
| `get_settings` | 読み取り | 設定ファイルからの読み込み |
| `add_profile` | 書き込み | プロファイル追加とファイル書き込み |
| `edit_profile` | 更新 | プロファイル更新 |
| `remove_profile` | 削除 | プロファイル削除とファイル削除 |
| `set_profile_active` | 更新 | アクティブ切替とシンボリックリンク |
| `scan_mods` | 読み取り | Modディレクトリのスキャン |
| `install_mod` | 書き込み | シンボリックリンク作成 |
| `uninstall_mod` | 削除 | シンボリックリンク削除 |
| `create_snapshot` | 書き込み | スナップショット作成（新規） |
| `restore_snapshot` | 書き込み | スナップショット復元（新規） |
| `delete_snapshot` | 削除 | スナップショット削除（新規） |
| `list_snapshots` | 読み取り | スナップショット一覧（新規） |

#### 3.1.2 統合テストケース

```rust
// テストケース例: src-tauri/tests/integration_tests.rs

use catalyzer::*;
use tempfile::tempdir;

#[tokio::test]
async fn test_profile_lifecycle() {
    // 1. 初期状態（プロファイルなし）
    // 2. プロファイル作成
    // 3. プロファイルをアクティブに
    // 4. Modインストール
    // 5. プロファイル削除
    // 6. 最終状態の検証
}

#[tokio::test]
async fn test_snapshot_lifecycle() {
    // 1. 環境をセットアップ
    // 2. スナップショット作成
    // 3. 環境を変更
    // 4. スナップショット復元
    // 5. 元の状態に戻っていることを検証
}

#[tokio::test]
async fn test_mod_installation_flow() {
    // 1. Modスキャン
    // 2. Modインストール
    // 3. シンボリックリンク確認
    // 4. Modアンインストール
    // 5. シンボリックリンク削除確認
}

#[tokio::test]
async fn test_settings_persistence() {
    // 1. 設定変更
    // 2. アプリ「再起動」（状態リセット）
    // 3. 設定が保持されていることを確認
}
```

### 3.2 フロントエンド-バックエンド連携テスト

#### 3.2.1 連携テストシナリオ

| シナリオ | フロント操作 | バックエンド処理 | 検証項目 |
|----------|--------------|------------------|----------|
| プロファイル作成 | フォーム入力→保存 | ファイル作成 | UIに反映、ファイル存在 |
| Modインストール | テーブルでトグル | シンボリックリンク作成 | 状態更新、リンク存在 |
| スナップショット保存 | 保存ボタン | フォルダコピー | 一覧に追加、ファイル存在 |
| スナップショット復元 | 復元ボタン | フォルダコピー | 状態変更、ファイル一致 |
| エラーハンドリング | 不正操作 | エラー返却 | エラー表示、状態維持 |

#### 3.2.2 エラーケーステスト

```typescript
// テストケース例: 連携エラーテスト

describe('Error handling integration', () => {
  it('should show error toast when profile creation fails', async () => {
    // プロファイル作成失敗時のエラー表示
  });

  it('should maintain state when snapshot restore fails', async () => {
    // スナップショット復元失敗時の状態維持
  });

  it('should handle network error gracefully', async () => {
    // ネットワークエラー時の処理
  });

  it('should handle disk full error', async () => {
    // ディスク容量不足時の処理
  });
});
```

---

## 4. E2Eテスト設計

### 4.1 テストツール選定

| ツール | 評価 | 採用理由 |
|--------|------|----------|
| **Playwright** | ★★★★★ | Tauri公式推奨、クロスプラットフォーム対応 |
| WebdriverIO | ★★★★☆ | Tauri対応あり、やや設定複雑 |
| Cypress | ★★☆☆☆ | Tauri非対応（Web専用） |

**採用**: Playwright + `@playwright/test`

### 4.2 主要ユースケースシナリオ

#### 4.2.1 シナリオ一覧

| ID | シナリオ | 優先度 | 自動化 |
|----|----------|--------|--------|
| E2E-001 | 初回起動〜プロファイル作成 | 高 | Yes |
| E2E-002 | Modのインストール/アンインストール | 高 | Yes |
| E2E-003 | プロファイル切替 | 高 | Yes |
| E2E-004 | スナップショット保存〜復元 | 高 | Yes |
| E2E-005 | ゲーム起動 | 中 | No（手動） |
| E2E-006 | ゲームダウンロード | 中 | No（時間かかる） |
| E2E-007 | 言語切替 | 低 | Yes |
| E2E-008 | エラーリカバリー | 中 | Partial |

#### 4.2.2 E2E-001: 初回起動〜プロファイル作成

```typescript
// テストケース例: tests/e2e/first-run.spec.ts

import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

test.describe('First run experience', () => {
  test('should create first profile on fresh install', async () => {
    // 1. アプリ起動
    const app = await electron.launch({ args: ['./src-tauri/target/release/catalyzer'] });
    const window = await app.firstWindow();

    // 2. 初回起動画面の表示確認
    await expect(window.locator('text=プロファイルを作成')).toBeVisible();

    // 3. プロファイル名入力
    await window.fill('[data-testid="profile-name-input"]', 'My First Profile');

    // 4. ゲームパス選択（モック or スキップ）
    await window.click('[data-testid="skip-game-path"]');

    // 5. 作成ボタンクリック
    await window.click('[data-testid="create-profile-button"]');

    // 6. メイン画面遷移確認
    await expect(window.locator('[data-testid="main-view"]')).toBeVisible();

    // 7. プロファイル名が表示されていること
    await expect(window.locator('text=My First Profile')).toBeVisible();

    await app.close();
  });
});
```

#### 4.2.3 E2E-004: スナップショット保存〜復元

```typescript
// テストケース例: tests/e2e/snapshot.spec.ts

test.describe('Snapshot workflow', () => {
  test('should save and restore snapshot', async () => {
    // 前提: プロファイルが存在する状態

    // 1. 現在の状態を確認（Mod数など）
    const initialModCount = await window.locator('[data-testid="mod-row"]').count();

    // 2. スナップショット保存
    await window.click('[data-testid="save-snapshot-button"]');
    await window.fill('[data-testid="snapshot-name-input"]', 'Test Snapshot');
    await window.click('[data-testid="confirm-save"]');

    // 3. 保存成功のトースト確認
    await expect(window.locator('text=スナップショットを保存しました')).toBeVisible();

    // 4. 環境を変更（Modをインストール）
    await window.click('[data-testid="mod-row"]:first-child [data-testid="install-toggle"]');

    // 5. スナップショット復元
    await window.click('[data-testid="snapshot-list-button"]');
    await window.click('text=Test Snapshot');
    await window.click('[data-testid="restore-button"]');

    // 6. 復元確認ダイアログ
    await window.click('[data-testid="confirm-restore"]');

    // 7. 元の状態に戻っていることを確認
    const restoredModCount = await window.locator('[data-testid="mod-row"]').count();
    expect(restoredModCount).toBe(initialModCount);
  });
});
```

### 4.3 E2Eテスト環境設定

```typescript
// playwright.config.ts

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 1,
  workers: 1, // Electronアプリは直列実行

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'electron',
      use: {
        // Electron用設定
      },
    },
  ],
});
```

---

## 5. 移行テスト設計

### 5.1 データ整合性テスト

#### 5.1.1 移行前後の検証項目

| 項目 | 検証内容 | 検証方法 |
|------|----------|----------|
| プロファイル数 | 移行前後で一致 | カウント比較 |
| プロファイル名 | 全て移行されている | 名前一覧比較 |
| Mod構成 | 各プロファイルのMod一覧が一致 | ハッシュ比較 |
| 設定ファイル | config/の内容が一致 | ファイルハッシュ |
| セーブデータ | saves/の内容が一致 | ファイルハッシュ |
| アクティブ状態 | アクティブプロファイルが保持 | 状態比較 |

#### 5.1.2 移行テストケース

```rust
// テストケース例: src-tauri/tests/migration_tests.rs

#[test]
fn test_migration_profile_count() {
    // 移行前後でプロファイル数が一致すること
}

#[test]
fn test_migration_mod_configuration() {
    // 各プロファイルのMod構成が保持されること
}

#[test]
fn test_migration_config_files() {
    // 設定ファイルが正しくコピーされること
}

#[test]
fn test_migration_save_data() {
    // セーブデータが正しくコピーされること
}

#[test]
fn test_migration_active_profile() {
    // アクティブプロファイルが保持されること
}

#[test]
fn test_migration_idempotent() {
    // 2回実行しても同じ結果になること
}
```

### 5.2 ロールバックテスト

#### 5.2.1 ロールバックシナリオ

| シナリオ | トリガー | 期待動作 |
|----------|----------|----------|
| 移行中断 | プロセス強制終了 | 移行前の状態を保持 |
| 部分的失敗 | 1つのプロファイル移行失敗 | 成功分は維持、失敗を報告 |
| ディスク容量不足 | 書き込み失敗 | エラー報告、部分データ削除 |
| ユーザーキャンセル | キャンセルボタン | 移行中止、クリーンアップ |

#### 5.2.2 ロールバックテストケース

```rust
// テストケース例: src-tauri/tests/rollback_tests.rs

#[test]
fn test_rollback_on_interruption() {
    // 移行中断時に元の状態を保持すること
}

#[test]
fn test_rollback_partial_failure() {
    // 部分的失敗時に成功分を維持すること
}

#[test]
fn test_rollback_disk_full() {
    // ディスク容量不足時のロールバック
}

#[test]
fn test_backup_creation() {
    // 移行前バックアップが作成されること
}

#[test]
fn test_backup_restoration() {
    // バックアップからの復元が可能なこと
}
```

### 5.3 移行パフォーマンステスト

| テスト項目 | 条件 | 目標時間 |
|------------|------|----------|
| 小規模移行 | 1プロファイル、10 Mod | < 5秒 |
| 中規模移行 | 5プロファイル、50 Mod | < 30秒 |
| 大規模移行 | 10プロファイル、100 Mod | < 2分 |
| セーブデータ含む | 100MB のセーブ | < 1分 |

---

## 6. パフォーマンステスト設計

### 6.1 ベンチマーク項目

| 項目 | 測定対象 | 測定方法 |
|------|----------|----------|
| アプリ起動時間 | 起動〜メイン画面表示 | タイマー計測 |
| 設定読み込み | get_settings 実行時間 | Rust計測 |
| Modスキャン | scan_mods 実行時間 | Rust計測 |
| スナップショット作成 | create_snapshot 実行時間 | Rust計測 |
| スナップショット復元 | restore_snapshot 実行時間 | Rust計測 |
| プロファイル切替 | set_profile_active 実行時間 | Rust計測 |
| UI応答性 | ボタンクリック〜反応 | フレーム計測 |

### 6.2 閾値設定

| 項目 | 目標値 | 警告値 | 失敗値 |
|------|--------|--------|--------|
| アプリ起動時間 | < 2秒 | 3秒 | 5秒 |
| 設定読み込み | < 100ms | 200ms | 500ms |
| Modスキャン（100 Mod） | < 500ms | 1秒 | 3秒 |
| スナップショット作成（50MB） | < 3秒 | 5秒 | 10秒 |
| スナップショット復元（50MB） | < 3秒 | 5秒 | 10秒 |
| プロファイル切替 | < 500ms | 1秒 | 2秒 |
| UIボタン応答 | < 100ms | 200ms | 500ms |

### 6.3 ベンチマーク実装

```rust
// ベンチマーク例: benches/performance.rs

use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_mod_scan(c: &mut Criterion) {
    // テスト用Modディレクトリをセットアップ
    let test_dir = setup_test_mods(100);

    c.bench_function("scan_100_mods", |b| {
        b.iter(|| {
            scan_mods(black_box(&test_dir))
        })
    });
}

fn benchmark_snapshot_create(c: &mut Criterion) {
    // テスト用環境をセットアップ
    let test_env = setup_test_environment();

    c.bench_function("create_snapshot_50mb", |b| {
        b.iter(|| {
            create_snapshot(black_box("bench_snapshot"), black_box(true))
        })
    });
}

fn benchmark_snapshot_restore(c: &mut Criterion) {
    // テスト用スナップショットをセットアップ
    let snapshot = setup_test_snapshot();

    c.bench_function("restore_snapshot_50mb", |b| {
        b.iter(|| {
            restore_snapshot(black_box(&snapshot.name))
        })
    });
}

criterion_group!(benches, benchmark_mod_scan, benchmark_snapshot_create, benchmark_snapshot_restore);
criterion_main!(benches);
```

### 6.4 パフォーマンス監視

```yaml
# .github/workflows/performance.yml

name: Performance Benchmarks

on:
  push:
    branches: [main]
  pull_request:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run benchmarks
        run: cargo bench --bench performance -- --save-baseline pr

      - name: Compare with main
        if: github.event_name == 'pull_request'
        run: cargo bench --bench performance -- --baseline main --save-baseline pr

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: target/criterion
```

---

## 7. テスト自動化・CI/CD

### 7.1 GitHub Actions ワークフロー

```yaml
# .github/workflows/test.yml

name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  # Rust ユニットテスト
  rust-unit-tests:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Run tests
        run: cargo test --manifest-path src-tauri/Cargo.toml

  # フロントエンドテスト
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test

  # 統合テスト
  integration-tests:
    runs-on: ubuntu-latest
    needs: [rust-unit-tests, frontend-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Run integration tests
        run: cargo test --manifest-path src-tauri/Cargo.toml --test '*'

  # E2Eテスト（リリース前のみ）
  e2e-tests:
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    needs: [integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install
      - run: npm run test:e2e
```

### 7.2 テストカバレッジレポート

```yaml
# .github/workflows/coverage.yml

name: Coverage Report

on:
  push:
    branches: [main]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Rust カバレッジ
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: llvm-tools-preview
      - uses: taiki-e/install-action@cargo-llvm-cov
      - run: cargo llvm-cov --manifest-path src-tauri/Cargo.toml --lcov --output-path rust-lcov.info

      # フロントエンド カバレッジ
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage

      # Codecov にアップロード
      - uses: codecov/codecov-action@v4
        with:
          files: ./rust-lcov.info,./coverage/lcov.info
```

---

## 8. 要検討事項

### 8.1 技術的な検討事項

| 項目 | 検討内容 | 決定状況 |
|------|----------|----------|
| E2Eテストのヘッドレス実行 | Tauri + Playwright でヘッドレス実行可能か | 要検討 |
| Windows での E2E | GitHub Actions Windows ランナーでの実行 | 要検討 |
| テストデータ管理 | フィクスチャの管理方法 | 要検討 |
| 大容量テスト | 実際のModサイズでのテスト環境 | 要検討 |

### 8.2 運用上の検討事項

| 項目 | 検討内容 | 決定状況 |
|------|----------|----------|
| テスト実行時間 | CI/CD の時間制限内に収まるか | 要測定 |
| フレーキーテスト対策 | 不安定なテストの検出と対処 | 要検討 |
| テストメンテナンス | テストコードの保守コスト | 要検討 |

---

## 変更履歴

| 日付 | 版 | 内容 |
|------|-----|------|
| 2026-01-27 | v1.0 | 初版作成 |
