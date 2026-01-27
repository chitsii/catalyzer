/**
 * Snapshot API ラッパー
 *
 * Tauri バックエンドのスナップショット関連コマンドを呼び出すTypeScript関数群。
 *
 * @see /docs/investigation/D_api_design.md - API仕様
 */

import { invoke } from '@tauri-apps/api/core';

// ============================================================
// 型定義
// ============================================================

export type Platform = 'macos' | 'windows' | 'linux';

export type Snapshot = {
  id: string;
  name: string;
  createdAt: string;
  gameVersionId: string;
  modCount: number;
  sizeBytes: number;
};

export type SnapshotSummary = Snapshot;

export type SnapshotDetail = {
  id: string;
  name: string;
  createdAt: string;
  gameVersionId: string;
  platform: Platform;
  description?: string;
  sizeBytes: number;
  mods: Array<{ id: string; name: string; version?: string }>;
  hasSaves: boolean;
  isGameInstalled: boolean;
};

export type DeleteResult = {
  deletedId: string;
  freedBytes: number;
};

export type RestoreResult = {
  success: boolean;
  snapshotId: string;
  gameDownloaded: boolean;
  modsRestored: number;
  backupCreated?: string;
};

export type RenameResult = {
  id: string;
  newName: string;
};

export type CreateSnapshotParams = {
  name: string;
  includeSaves?: boolean;
  description?: string;
};

export type DeleteSnapshotOptions = {
  force?: boolean;
};

export type RestoreSnapshotOptions = {
  restoreSaves?: boolean;
  backupCurrent?: boolean;
};

// ============================================================
// API関数
// ============================================================

/**
 * スナップショットを新規作成する
 *
 * @param params - 作成パラメータ
 * @param params.name - スナップショット名
 * @param params.includeSaves - セーブデータを含めるか（デフォルト: true）
 * @param params.description - スナップショットの説明（オプション）
 * @returns 作成されたスナップショット情報
 * @throws SNAPSHOT_NAME_EXISTS - 同名のスナップショットが既に存在する
 * @throws INVALID_NAME - 無効な文字がスナップショット名に含まれている
 * @throws DISK_FULL - ディスク容量不足
 */
export async function createSnapshot(params: CreateSnapshotParams): Promise<Snapshot> {
  return invoke<Snapshot>('create_snapshot', {
    name: params.name,
    include_saves: params.includeSaves ?? true,
    description: params.description,
  });
}

/**
 * 保存済みスナップショットの一覧を取得する
 *
 * @returns スナップショット一覧（作成日時降順）
 * @throws IO_ERROR - ディレクトリ読み取りエラー
 */
export async function listSnapshots(): Promise<SnapshotSummary[]> {
  return invoke<SnapshotSummary[]>('list_snapshots');
}

/**
 * スナップショットの詳細情報を取得する
 *
 * @param snapshotId - スナップショットID
 * @returns スナップショット詳細情報
 * @throws SNAPSHOT_NOT_FOUND - スナップショットが見つからない
 * @throws META_CORRUPTED - メタデータファイルが破損している
 */
export async function getSnapshot(snapshotId: string): Promise<SnapshotDetail> {
  return invoke<SnapshotDetail>('get_snapshot', {
    snapshot_id: snapshotId,
  });
}

/**
 * スナップショットを削除する
 *
 * @param snapshotId - 削除するスナップショットID
 * @param options - 削除オプション
 * @param options.force - 確認なしで削除するか（デフォルト: false）
 * @returns 削除結果
 * @throws SNAPSHOT_NOT_FOUND - スナップショットが見つからない
 * @throws SNAPSHOT_IS_ACTIVE - アクティブなスナップショットは削除できない
 */
export async function deleteSnapshot(
  snapshotId: string,
  options?: DeleteSnapshotOptions
): Promise<DeleteResult> {
  return invoke<DeleteResult>('delete_snapshot', {
    snapshot_id: snapshotId,
    force: options?.force,
  });
}

/**
 * スナップショットから環境を復元する
 *
 * @param snapshotId - 復元するスナップショットID
 * @param options - 復元オプション
 * @param options.restoreSaves - セーブデータも復元するか（デフォルト: true）
 * @param options.backupCurrent - 現在の状態をバックアップしてから復元するか（デフォルト: false）
 * @returns 復元結果
 * @throws SNAPSHOT_NOT_FOUND - スナップショットが見つからない
 * @throws GAME_DOWNLOAD_REQUIRED - ゲームのダウンロードが必要
 * @throws RESTORE_FAILED - 復元処理中にエラーが発生
 */
export async function restoreSnapshot(
  snapshotId: string,
  options?: RestoreSnapshotOptions
): Promise<RestoreResult> {
  return invoke<RestoreResult>('restore_snapshot', {
    snapshot_id: snapshotId,
    restore_saves: options?.restoreSaves,
    backup_current: options?.backupCurrent,
  });
}

/**
 * スナップショット名を変更する
 *
 * @param snapshotId - 変更対象のスナップショットID
 * @param newName - 新しいスナップショット名
 * @returns 変更結果
 * @throws SNAPSHOT_NOT_FOUND - スナップショットが見つからない
 * @throws NAME_EXISTS - 同名のスナップショットが既に存在する
 * @throws INVALID_NAME - 無効な文字が名前に含まれている
 */
export async function renameSnapshot(
  snapshotId: string,
  newName: string
): Promise<RenameResult> {
  return invoke<RenameResult>('rename_snapshot', {
    snapshot_id: snapshotId,
    new_name: newName,
  });
}

// ============================================================
// Storage API 型定義
// ============================================================

export type StorageUsage = {
  snapshotsTotalBytes: number;
  gamesTotalBytes: number;
  totalBytes: number;
  warningThresholdBytes: number;
  isOverThreshold: boolean;
  diskFreeBytes: number;
};

export type CleanupResult = {
  dryRun: boolean;
  deletedCount: number;
  freedBytes: number;
  deletedSnapshots: string[];
  keptSnapshots: string[];
};

export type CleanupParams = {
  keepDays: number;
  keepMinCount: number;
  dryRun?: boolean;
};

// ============================================================
// Game Version API 型定義
// ============================================================

export type GameVersion = {
  id: string;
  releaseType: 'stable' | 'experimental';
  releaseDate: string;
  platform: Platform;
  isInstalled: boolean;
  installPath?: string;
  sizeBytes?: number;
  downloadUrl?: string;
};

export type GameVersionList = {
  installed: GameVersion[];
  available?: GameVersion[];
};

export type ListGameVersionsOptions = {
  includeRemote?: boolean;
};

// ============================================================
// Storage API 関数
// ============================================================

/**
 * ストレージ使用量を取得する
 *
 * @returns ストレージ使用量情報
 * @throws IO_ERROR - ディレクトリ読み取りエラー
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  return invoke<StorageUsage>('get_storage_usage');
}

/**
 * 古いスナップショットをクリーンアップする
 *
 * @param params - クリーンアップパラメータ
 * @param params.keepDays - 保持する日数
 * @param params.keepMinCount - 最低限保持するスナップショット数
 * @param params.dryRun - ドライラン（実際には削除しない）（デフォルト: true）
 * @returns クリーンアップ結果
 * @throws CLEANUP_FAILED - クリーンアップ処理中にエラーが発生
 */
export async function cleanupOldSnapshots(params: CleanupParams): Promise<CleanupResult> {
  return invoke<CleanupResult>('cleanup_old_snapshots', {
    keep_days: params.keepDays,
    keep_min_count: params.keepMinCount,
    dry_run: params.dryRun ?? true,
  });
}

// ============================================================
// Game Version API 関数
// ============================================================

/**
 * ゲームバージョン一覧を取得する
 *
 * @param options - 取得オプション
 * @param options.includeRemote - リモートの利用可能バージョンも取得するか（デフォルト: false）
 * @returns ゲームバージョン一覧
 * @throws NETWORK_ERROR - リモート取得時のネットワークエラー
 */
export async function listGameVersions(
  options?: ListGameVersionsOptions
): Promise<GameVersionList> {
  return invoke<GameVersionList>('list_game_versions', {
    include_remote: options?.includeRemote ?? false,
  });
}
