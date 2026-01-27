# 領域D: API・通信層設計

> **作成日**: 2026-01-27
> **担当**: 足軽4号（シニアソフトウェアエンジニア ペルソナ）
> **ステータス**: Draft
> **親タスク**: cmd_001 / subtask_D01

---

## 1. Tauriコマンド一覧と詳細仕様

### 1.1 コマンド一覧

| カテゴリ | コマンド名 | 説明 | Phase |
|----------|-----------|------|-------|
| スナップショット | `create_snapshot` | スナップショット作成 | 2 |
| スナップショット | `list_snapshots` | スナップショット一覧取得 | 2 |
| スナップショット | `get_snapshot` | スナップショット詳細取得 | 2 |
| スナップショット | `restore_snapshot` | スナップショット復元 | 3 |
| スナップショット | `delete_snapshot` | スナップショット削除 | 2 |
| スナップショット | `rename_snapshot` | スナップショット名変更 | 2 |
| ゲームバージョン | `list_game_versions` | インストール済みバージョン一覧 | 2 |
| ゲームバージョン | `download_game_version` | ゲームダウンロード | 3 |
| ゲームバージョン | `delete_game_version` | ゲームバージョン削除 | 3 |
| ストレージ | `get_storage_usage` | 容量使用状況取得 | 2 |
| ストレージ | `cleanup_old_snapshots` | 古いスナップショット削除 | 3 |

---

### 1.2 スナップショットコマンド詳細

#### `create_snapshot`

スナップショットを新規作成する。

```yaml
# OpenAPI風仕様
path: /commands/create_snapshot
method: invoke

request:
  name:
    type: string
    required: true
    validation:
      - min_length: 1
      - max_length: 100
      - pattern: "^[^/\\\\:*?\"<>|]+$"  # ファイル名に使えない文字を除外
    description: "スナップショット名（ディレクトリ名としても使用）"

  include_saves:
    type: boolean
    required: false
    default: true
    description: "セーブデータを含めるか"

  description:
    type: string
    required: false
    max_length: 500
    description: "スナップショットの説明"

response:
  success:
    type: Snapshot
    description: "作成されたスナップショット情報"

  error:
    type: ApiError
    cases:
      - code: "SNAPSHOT_NAME_EXISTS"
        message: "同名のスナップショットが既に存在します"
      - code: "INVALID_NAME"
        message: "スナップショット名に使用できない文字が含まれています"
      - code: "NO_ACTIVE_PROFILE"
        message: "アクティブなプロファイルがありません"
      - code: "DISK_FULL"
        message: "ディスク容量が不足しています"
      - code: "IO_ERROR"
        message: "ファイル操作中にエラーが発生しました"
```

**処理フロー**:
1. 名前のバリデーション
2. 同名スナップショットの存在チェック
3. ディスク容量の事前チェック
4. スナップショットディレクトリ作成
5. mods/ フォルダをコピー
6. config/ フォルダをコピー
7. saves/ フォルダをコピー（include_saves=true の場合）
8. meta.yaml を作成
9. 容量を計算して記録
10. 作成完了

---

#### `list_snapshots`

保存済みスナップショットの一覧を取得する。

```yaml
path: /commands/list_snapshots
method: invoke

request:
  # パラメータなし

response:
  success:
    type: SnapshotSummary[]
    description: "スナップショット一覧（作成日時降順）"

  error:
    type: ApiError
    cases:
      - code: "SNAPSHOTS_DIR_NOT_FOUND"
        message: "スナップショットディレクトリが見つかりません"
      - code: "IO_ERROR"
        message: "ディレクトリ読み取り中にエラーが発生しました"
```

**レスポンス例**:
```json
[
  {
    "id": "Stable_0I_日本語環境",
    "name": "Stable 0.I + 日本語環境",
    "createdAt": "2026-01-27T19:00:00Z",
    "gameVersionId": "cdda-0.I-2026-01-20-1811",
    "modCount": 5,
    "sizeBytes": 52428800
  },
  {
    "id": "Experimental_テスト",
    "name": "Experimental テスト",
    "createdAt": "2026-01-26T10:00:00Z",
    "gameVersionId": "cdda-exp-2026-01-25-0412",
    "modCount": 3,
    "sizeBytes": 31457280
  }
]
```

---

#### `get_snapshot`

スナップショットの詳細情報を取得する。

```yaml
path: /commands/get_snapshot
method: invoke

request:
  snapshot_id:
    type: string
    required: true
    description: "スナップショットID（ディレクトリ名）"

response:
  success:
    type: SnapshotDetail
    description: "スナップショット詳細情報"

  error:
    type: ApiError
    cases:
      - code: "SNAPSHOT_NOT_FOUND"
        message: "指定されたスナップショットが見つかりません"
      - code: "META_CORRUPTED"
        message: "メタデータファイルが破損しています"
```

**レスポンス型**:
```typescript
type SnapshotDetail = {
  id: string;
  name: string;
  createdAt: string;
  gameVersionId: string;
  platform: Platform;
  description?: string;
  sizeBytes: number;
  mods: ModSummary[];       // 含まれるMod一覧
  hasSaves: boolean;        // セーブデータの有無
  isGameInstalled: boolean; // ゲームがインストール済みか
};

type ModSummary = {
  id: string;
  name: string;
  version?: string;
};
```

---

#### `restore_snapshot`

スナップショットから環境を復元する。

```yaml
path: /commands/restore_snapshot
method: invoke

request:
  snapshot_id:
    type: string
    required: true
    description: "復元するスナップショットID"

  restore_saves:
    type: boolean
    required: false
    default: true
    description: "セーブデータも復元するか"

  backup_current:
    type: boolean
    required: false
    default: false
    description: "現在の状態をバックアップしてから復元するか"

response:
  success:
    type: RestoreResult
    description: "復元結果"

  error:
    type: ApiError
    cases:
      - code: "SNAPSHOT_NOT_FOUND"
        message: "指定されたスナップショットが見つかりません"
      - code: "GAME_DOWNLOAD_REQUIRED"
        message: "ゲームのダウンロードが必要です"
      - code: "RESTORE_FAILED"
        message: "復元処理中にエラーが発生しました"
      - code: "DISK_FULL"
        message: "ディスク容量が不足しています"
```

**レスポンス型**:
```typescript
type RestoreResult = {
  success: boolean;
  snapshotId: string;
  gameDownloaded: boolean;  // ゲームをダウンロードしたか
  modsRestored: number;     // 復元したMod数
  backupCreated?: string;   // 作成したバックアップのID
};
```

---

#### `delete_snapshot`

スナップショットを削除する。

```yaml
path: /commands/delete_snapshot
method: invoke

request:
  snapshot_id:
    type: string
    required: true
    description: "削除するスナップショットID"

  force:
    type: boolean
    required: false
    default: false
    description: "確認なしで削除するか"

response:
  success:
    type: DeleteResult
    description: "削除結果"

  error:
    type: ApiError
    cases:
      - code: "SNAPSHOT_NOT_FOUND"
        message: "指定されたスナップショットが見つかりません"
      - code: "SNAPSHOT_IS_ACTIVE"
        message: "アクティブなスナップショットは削除できません"
      - code: "IO_ERROR"
        message: "削除処理中にエラーが発生しました"
```

**レスポンス型**:
```typescript
type DeleteResult = {
  deletedId: string;
  freedBytes: number;
};
```

---

#### `rename_snapshot`

スナップショット名を変更する。

```yaml
path: /commands/rename_snapshot
method: invoke

request:
  snapshot_id:
    type: string
    required: true
    description: "変更対象のスナップショットID"

  new_name:
    type: string
    required: true
    validation:
      - min_length: 1
      - max_length: 100
      - pattern: "^[^/\\\\:*?\"<>|]+$"
    description: "新しいスナップショット名"

response:
  success:
    type: RenameResult
    description: "変更結果"

  error:
    type: ApiError
    cases:
      - code: "SNAPSHOT_NOT_FOUND"
        message: "指定されたスナップショットが見つかりません"
      - code: "NAME_EXISTS"
        message: "同名のスナップショットが既に存在します"
      - code: "INVALID_NAME"
        message: "スナップショット名に使用できない文字が含まれています"
```

---

### 1.3 ゲームバージョンコマンド詳細

#### `list_game_versions`

インストール済みおよび利用可能なゲームバージョンを取得する。

```yaml
path: /commands/list_game_versions
method: invoke

request:
  include_remote:
    type: boolean
    required: false
    default: false
    description: "リモート（GitHub）の利用可能バージョンも含めるか"

response:
  success:
    type: GameVersionList
    description: "ゲームバージョン一覧"

  error:
    type: ApiError
    cases:
      - code: "IO_ERROR"
        message: "ディレクトリ読み取り中にエラーが発生しました"
      - code: "NETWORK_ERROR"
        message: "GitHubへの接続に失敗しました"
```

**レスポンス型**:
```typescript
type GameVersionList = {
  installed: GameVersion[];
  available?: GameVersion[];  // include_remote=true の場合
};

type GameVersion = {
  id: string;                    // 例: "cdda-0.I-2026-01-20-1811"
  releaseType: "stable" | "experimental";
  releaseDate: string;
  platform: Platform;
  isInstalled: boolean;
  installPath?: string;
  sizeBytes?: number;            // インストール済みの場合のみ
  downloadUrl?: string;          // 未インストールの場合のみ
};
```

---

#### `download_game_version`

ゲームバージョンをダウンロードしてインストールする。

```yaml
path: /commands/download_game_version
method: invoke

request:
  version_id:
    type: string
    required: true
    description: "ダウンロードするバージョンID"

response:
  success:
    type: void
    description: "成功時は空レスポンス（進捗はChannelで通知）"

  error:
    type: ApiError
    cases:
      - code: "VERSION_NOT_FOUND"
        message: "指定されたバージョンが見つかりません"
      - code: "ALREADY_INSTALLED"
        message: "このバージョンは既にインストールされています"
      - code: "NETWORK_ERROR"
        message: "ダウンロード中にネットワークエラーが発生しました"
      - code: "DISK_FULL"
        message: "ディスク容量が不足しています"
      - code: "EXTRACT_FAILED"
        message: "アーカイブの展開に失敗しました"

# 進捗通知（Tauri Channel経由）
progress_channel:
  type: DownloadProgress
  events:
    - stage: "downloading"
      fields: [downloadedBytes, totalBytes, percentage]
    - stage: "extracting"
      fields: [extractedFiles, totalFiles, percentage]
    - stage: "completed"
      fields: [installPath]
    - stage: "failed"
      fields: [errorCode, errorMessage]
```

**進捗型**:
```typescript
type DownloadProgress =
  | { stage: "downloading"; downloadedBytes: number; totalBytes: number; percentage: number }
  | { stage: "extracting"; extractedFiles: number; totalFiles: number; percentage: number }
  | { stage: "completed"; installPath: string }
  | { stage: "failed"; errorCode: string; errorMessage: string };
```

---

#### `delete_game_version`

インストール済みゲームバージョンを削除する。

```yaml
path: /commands/delete_game_version
method: invoke

request:
  version_id:
    type: string
    required: true
    description: "削除するバージョンID"

response:
  success:
    type: DeleteResult
    description: "削除結果"

  error:
    type: ApiError
    cases:
      - code: "VERSION_NOT_FOUND"
        message: "指定されたバージョンが見つかりません"
      - code: "VERSION_IN_USE"
        message: "このバージョンは使用中のスナップショットがあります"
      - code: "IO_ERROR"
        message: "削除処理中にエラーが発生しました"
```

---

### 1.4 ストレージ管理コマンド詳細

#### `get_storage_usage`

ストレージ使用状況を取得する。

```yaml
path: /commands/get_storage_usage
method: invoke

request:
  # パラメータなし

response:
  success:
    type: StorageUsage
    description: "ストレージ使用状況"

  error:
    type: ApiError
    cases:
      - code: "IO_ERROR"
        message: "ディスク情報の取得に失敗しました"
```

**レスポンス型**:
```typescript
type StorageUsage = {
  snapshotsTotalBytes: number;
  gamesTotalBytes: number;
  totalBytes: number;
  warningThresholdBytes: number;
  isOverThreshold: boolean;
  diskFreeBytes: number;         // 追加: ディスク残り容量
  breakdown: StorageBreakdown[]; // 追加: 内訳
};

type StorageBreakdown = {
  id: string;           // スナップショットID or ゲームバージョンID
  type: "snapshot" | "game";
  sizeBytes: number;
  lastAccessed: string; // 最終アクセス日時
};
```

---

#### `cleanup_old_snapshots`

条件に基づいて古いスナップショットを削除する。

```yaml
path: /commands/cleanup_old_snapshots
method: invoke

request:
  keep_days:
    type: number
    required: true
    validation:
      - min: 1
      - max: 365
    description: "この日数より古いスナップショットを削除"

  keep_min_count:
    type: number
    required: true
    validation:
      - min: 1
      - max: 100
    description: "最低限残すスナップショット数"

  dry_run:
    type: boolean
    required: false
    default: true
    description: "実際には削除せず、削除対象のみ返す"

response:
  success:
    type: CleanupResult
    description: "クリーンアップ結果"

  error:
    type: ApiError
    cases:
      - code: "IO_ERROR"
        message: "クリーンアップ処理中にエラーが発生しました"
```

**レスポンス型**:
```typescript
type CleanupResult = {
  dryRun: boolean;
  deletedCount: number;
  freedBytes: number;
  deletedSnapshots: string[];  // 削除したスナップショットID一覧
  keptSnapshots: string[];     // 保持したスナップショットID一覧
};
```

---

## 2. エラーケース設計

### 2.1 エラーコード体系

```
エラーコード形式: {CATEGORY}_{SPECIFIC_ERROR}

カテゴリ:
  SNAPSHOT_  : スナップショット関連
  GAME_      : ゲームバージョン関連
  STORAGE_   : ストレージ関連
  NETWORK_   : ネットワーク関連
  IO_        : ファイルI/O関連
  VALIDATION_: 入力検証関連
  INTERNAL_  : 内部エラー
```

### 2.2 エラーコード一覧

| コード | HTTP相当 | 説明 | ユーザー向けメッセージ |
|--------|---------|------|----------------------|
| `SNAPSHOT_NOT_FOUND` | 404 | スナップショットが存在しない | スナップショットが見つかりません |
| `SNAPSHOT_NAME_EXISTS` | 409 | 同名スナップショットが存在 | 同じ名前のスナップショットが既にあります |
| `SNAPSHOT_IS_ACTIVE` | 409 | アクティブなスナップショット | 使用中のスナップショットは削除できません |
| `GAME_NOT_FOUND` | 404 | ゲームバージョンが存在しない | ゲームバージョンが見つかりません |
| `GAME_DOWNLOAD_REQUIRED` | 428 | ゲームのダウンロードが必要 | ゲームのダウンロードが必要です |
| `GAME_IN_USE` | 409 | ゲームが使用中 | このゲームは使用中です |
| `STORAGE_DISK_FULL` | 507 | ディスク容量不足 | ディスク容量が不足しています |
| `STORAGE_OVER_THRESHOLD` | 429 | 容量警告閾値超過 | ストレージ使用量が警告値を超えています |
| `NETWORK_TIMEOUT` | 408 | タイムアウト | 接続がタイムアウトしました |
| `NETWORK_UNREACHABLE` | 503 | 接続不可 | インターネットに接続できません |
| `IO_PERMISSION_DENIED` | 403 | 権限不足 | ファイルへのアクセスが拒否されました |
| `IO_READ_ERROR` | 500 | 読み取りエラー | ファイルの読み取りに失敗しました |
| `IO_WRITE_ERROR` | 500 | 書き込みエラー | ファイルの書き込みに失敗しました |
| `VALIDATION_INVALID_NAME` | 400 | 無効な名前 | 名前に使用できない文字が含まれています |
| `VALIDATION_REQUIRED_FIELD` | 400 | 必須フィールド欠落 | 必須項目が入力されていません |
| `INTERNAL_UNEXPECTED` | 500 | 予期しないエラー | 予期しないエラーが発生しました |

### 2.3 エラーレスポンス型

```rust
// Rust側
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,           // エラーコード
    pub message: String,        // 開発者向けメッセージ
    pub user_message: String,   // ユーザー向けメッセージ（i18nキー）
    pub details: Option<serde_json::Value>,  // 追加情報
    pub recoverable: bool,      // リトライ可能か
}
```

```typescript
// TypeScript側
type ApiError = {
  code: string;
  message: string;
  userMessage: string;  // i18nキーとして使用
  details?: Record<string, unknown>;
  recoverable: boolean;
};
```

### 2.4 フロントエンドでのエラーハンドリング指針

```typescript
// src/lib/api-client.ts

import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { t } from "@/i18n";

export async function invokeWithErrorHandling<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const apiError = error as ApiError;

    // ユーザー向けトースト表示
    toast.error(t(apiError.userMessage));

    // リカバリー可能なエラーの場合、リトライUIを表示
    if (apiError.recoverable) {
      // リトライダイアログ表示
    }

    // エラーログ送信（開発時）
    console.error(`[${apiError.code}] ${apiError.message}`, apiError.details);

    throw error;
  }
}
```

---

## 3. 非同期処理設計

### 3.1 長時間処理の扱い

長時間かかる処理には **Tauri Channel** を使用して進捗を通知する。

#### 対象処理

| 処理 | 予想時間 | 通知方式 |
|------|---------|---------|
| `create_snapshot` | 数秒〜数十秒 | 進捗Channel |
| `restore_snapshot` | 数秒〜数十秒 | 進捗Channel |
| `download_game_version` | 数分〜数十分 | 進捗Channel |
| `cleanup_old_snapshots` | 数秒〜数分 | 進捗Channel |

### 3.2 進捗通知設計

```rust
// src-tauri/src/progress.rs

use tauri::ipc::Channel;
use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ProgressEvent {
    Started {
        operation: String,
        total_steps: Option<u64>,
    },
    Progress {
        current: u64,
        total: u64,
        percentage: f32,
        message: Option<String>,
    },
    Completed {
        message: Option<String>,
    },
    Failed {
        code: String,
        message: String,
    },
}

pub fn emit_progress(channel: &Channel<ProgressEvent>, event: ProgressEvent) {
    let _ = channel.send(event);
}
```

### 3.3 フロントエンド側の受信

```typescript
// src/lib/progress-handler.ts

import { Channel } from "@tauri-apps/api/core";

type ProgressEvent =
  | { type: "started"; operation: string; totalSteps?: number }
  | { type: "progress"; current: number; total: number; percentage: number; message?: string }
  | { type: "completed"; message?: string }
  | { type: "failed"; code: string; message: string };

export function createProgressChannel(
  onProgress: (event: ProgressEvent) => void
): Channel<ProgressEvent> {
  return new Channel<ProgressEvent>((event) => {
    onProgress(event);
  });
}

// 使用例
const channel = createProgressChannel((event) => {
  switch (event.type) {
    case "started":
      setIsLoading(true);
      break;
    case "progress":
      setProgress(event.percentage);
      break;
    case "completed":
      setIsLoading(false);
      toast.success(event.message);
      break;
    case "failed":
      setIsLoading(false);
      toast.error(event.message);
      break;
  }
});

await invoke("download_game_version", {
  versionId: "cdda-0.I",
  onProgress: channel
});
```

### 3.4 キャンセル機能

長時間処理はキャンセル可能にする。

```rust
// src-tauri/src/cancellation.rs

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub struct CancellationToken {
    cancelled: Arc<AtomicBool>,
}

impl CancellationToken {
    pub fn new() -> Self {
        Self {
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }
}
```

```typescript
// フロントエンド側
const [operationId, setOperationId] = useState<string | null>(null);

// 処理開始
const id = await invoke<string>("start_download", { versionId });
setOperationId(id);

// キャンセル
await invoke("cancel_operation", { operationId });
```

---

## 4. バッチ操作設計

### 4.1 複数スナップショットの一括操作

#### `delete_snapshots_batch`

```yaml
path: /commands/delete_snapshots_batch
method: invoke

request:
  snapshot_ids:
    type: string[]
    required: true
    validation:
      - min_length: 1
      - max_length: 50
    description: "削除するスナップショットIDの配列"

response:
  success:
    type: BatchDeleteResult
    description: "一括削除結果"

  error:
    type: ApiError
```

**レスポンス型**:
```typescript
type BatchDeleteResult = {
  succeeded: string[];        // 成功したID
  failed: BatchFailure[];     // 失敗したID
  totalFreedBytes: number;
};

type BatchFailure = {
  id: string;
  error: ApiError;
};
```

### 4.2 バッチ操作の設計原則

1. **部分成功を許容**: 一部失敗しても他は続行
2. **トランザクション不要**: 各操作は独立
3. **進捗通知**: 各項目の完了を通知
4. **結果の詳細報告**: 成功/失敗を個別に報告

```rust
// src-tauri/src/batch.rs

pub async fn batch_delete_snapshots(
    ids: Vec<String>,
    channel: Channel<BatchProgress>,
) -> Result<BatchDeleteResult, ApiError> {
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();
    let mut total_freed = 0u64;

    for (index, id) in ids.iter().enumerate() {
        channel.send(BatchProgress {
            current: index + 1,
            total: ids.len(),
            current_id: id.clone(),
        })?;

        match delete_snapshot_internal(id).await {
            Ok(result) => {
                total_freed += result.freed_bytes;
                succeeded.push(id.clone());
            }
            Err(e) => {
                failed.push(BatchFailure {
                    id: id.clone(),
                    error: e,
                });
            }
        }
    }

    Ok(BatchDeleteResult {
        succeeded,
        failed,
        total_freed_bytes: total_freed,
    })
}
```

---

## 5. キャッシュ戦略

### 5.1 フロントエンド側キャッシュ

TanStack Query を使用したキャッシュ戦略。

#### キャッシュ設定

| データ | staleTime | cacheTime | 説明 |
|--------|-----------|-----------|------|
| スナップショット一覧 | 30秒 | 5分 | 頻繁に変更されない |
| スナップショット詳細 | 1分 | 10分 | 詳細データは長めにキャッシュ |
| ゲームバージョン一覧 | 5分 | 30分 | ほぼ変更されない |
| ストレージ使用状況 | 10秒 | 1分 | 操作後は即時更新が必要 |

```typescript
// src/lib/queries.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// スナップショット一覧
export function useSnapshots() {
  return useQuery({
    queryKey: ["snapshots"],
    queryFn: () => invoke<SnapshotSummary[]>("list_snapshots"),
    staleTime: 30 * 1000,      // 30秒
    gcTime: 5 * 60 * 1000,     // 5分
  });
}

// スナップショット詳細
export function useSnapshot(id: string) {
  return useQuery({
    queryKey: ["snapshot", id],
    queryFn: () => invoke<SnapshotDetail>("get_snapshot", { snapshotId: id }),
    staleTime: 60 * 1000,      // 1分
    gcTime: 10 * 60 * 1000,    // 10分
    enabled: !!id,
  });
}

// ストレージ使用状況
export function useStorageUsage() {
  return useQuery({
    queryKey: ["storage"],
    queryFn: () => invoke<StorageUsage>("get_storage_usage"),
    staleTime: 10 * 1000,      // 10秒
    gcTime: 60 * 1000,         // 1分
  });
}
```

### 5.2 キャッシュ無効化タイミング

| 操作 | 無効化対象 |
|------|-----------|
| `create_snapshot` | `["snapshots"]`, `["storage"]` |
| `delete_snapshot` | `["snapshots"]`, `["snapshot", id]`, `["storage"]` |
| `restore_snapshot` | `["snapshots"]` (active状態が変わる) |
| `rename_snapshot` | `["snapshots"]`, `["snapshot", id]` |
| `download_game_version` | `["gameVersions"]`, `["storage"]` |
| `delete_game_version` | `["gameVersions"]`, `["storage"]` |
| `cleanup_old_snapshots` | `["snapshots"]`, `["storage"]` |

```typescript
// src/lib/mutations.ts

export function useCreateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateSnapshotParams) =>
      invoke<Snapshot>("create_snapshot", params),
    onSuccess: () => {
      // キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      invoke<DeleteResult>("delete_snapshot", { snapshotId: id }),
    onSuccess: (_, id) => {
      // 特定のキャッシュを削除
      queryClient.removeQueries({ queryKey: ["snapshot", id] });
      // 一覧を無効化
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
    },
  });
}
```

### 5.3 楽観的更新（Optimistic Updates）

ユーザー体験向上のため、一部操作では楽観的更新を行う。

```typescript
// スナップショット削除の楽観的更新
export function useDeleteSnapshotOptimistic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      invoke<DeleteResult>("delete_snapshot", { snapshotId: id }),

    // 楽観的に更新
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["snapshots"] });

      const previous = queryClient.getQueryData<SnapshotSummary[]>(["snapshots"]);

      queryClient.setQueryData<SnapshotSummary[]>(
        ["snapshots"],
        (old) => old?.filter((s) => s.id !== id) ?? []
      );

      return { previous };
    },

    // エラー時はロールバック
    onError: (err, id, context) => {
      queryClient.setQueryData(["snapshots"], context?.previous);
      toast.error("削除に失敗しました");
    },

    // 成功/失敗に関わらず最終的に再取得
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
    },
  });
}
```

---

## 6. 要検討事項

### 6.1 未決定事項

| 項目 | 選択肢 | 推奨 | 理由 |
|------|--------|------|------|
| スナップショットIDの形式 | UUID vs ディレクトリ名 | ディレクトリ名 | シンプルで人間可読 |
| 大規模Modのコピー方式 | 同期 vs 非同期ストリーム | 非同期 | UIブロック回避 |
| 復元時の競合処理 | 上書き vs 確認ダイアログ | 確認ダイアログ | データ損失防止 |
| バックエンドのエラー情報 | 詳細 vs 簡潔 | 簡潔+ログ | セキュリティ配慮 |

### 6.2 将来の拡張ポイント

1. **スナップショットのエクスポート/インポート**
   - ZIP形式でのエクスポート
   - 他ユーザーとの共有機能

2. **クラウド同期**
   - スナップショットのクラウドバックアップ
   - 複数デバイス間での同期

3. **差分保存**
   - 容量削減のための差分スナップショット
   - 実装複雑性とのトレードオフ

---

## 変更履歴

| 日付 | 版 | 変更内容 |
|------|-----|----------|
| 2026-01-27 | v1.0 | 初版作成 |
