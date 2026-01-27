/**
 * Snapshot API ラッパーテスト
 *
 * TDD原則: テストを先に書く（RED状態）
 * これらのテストは実装完了後に GREEN になる。
 *
 * @see /docs/investigation/D_api_design.md - API仕様
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tauri invoke をモック
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

// ============================================================
// テスト対象
// ============================================================
import {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  deleteSnapshot,
  restoreSnapshot,
  renameSnapshot,
  getStorageUsage,
  cleanupOldSnapshots,
  listGameVersions,
} from './snapshot-api';

// ============================================================
// 型定義（D_api_design.md に基づく）
// ============================================================
type Snapshot = {
  id: string;
  name: string;
  createdAt: string;
  gameVersionId: string;
  modCount: number;
  sizeBytes: number;
};

type SnapshotSummary = {
  id: string;
  name: string;
  createdAt: string;
  gameVersionId: string;
  modCount: number;
  sizeBytes: number;
};

type SnapshotDetail = {
  id: string;
  name: string;
  createdAt: string;
  gameVersionId: string;
  platform: 'macos' | 'windows' | 'linux';
  description?: string;
  sizeBytes: number;
  mods: Array<{ id: string; name: string; version?: string }>;
  hasSaves: boolean;
  isGameInstalled: boolean;
};

type DeleteResult = {
  deletedId: string;
  freedBytes: number;
};

type RestoreResult = {
  success: boolean;
  snapshotId: string;
  gameDownloaded: boolean;
  modsRestored: number;
  backupCreated?: string;
};

type ApiError = {
  code: string;
  message: string;
  userMessage: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
};

// ============================================================
// テストスイート
// ============================================================

describe('Snapshot API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ----------------------------------------------------------
  // createSnapshot
  // ----------------------------------------------------------
  describe('createSnapshot', () => {
    it('should call invoke with correct command and params', async () => {
      // Arrange
      const mockSnapshot: Snapshot = {
        id: 'Stable_0I_日本語環境',
        name: 'Stable 0.I + 日本語環境',
        createdAt: '2026-01-27T19:00:00Z',
        gameVersionId: 'cdda-0.I-2026-01-20-1811',
        modCount: 5,
        sizeBytes: 52428800,
      };
      vi.mocked(invoke).mockResolvedValue(mockSnapshot);

      // Act
      const result = await createSnapshot({
        name: 'Stable 0.I + 日本語環境',
        includeSaves: true,
      });

      // Assert
      expect(invoke).toHaveBeenCalledWith('create_snapshot', {
        name: 'Stable 0.I + 日本語環境',
        include_saves: true,
        description: undefined,
      });
      expect(result).toEqual(mockSnapshot);
    });

    it('should handle optional description parameter', async () => {
      // Arrange
      vi.mocked(invoke).mockResolvedValue({
        id: 'test-snapshot',
        name: 'Test',
        createdAt: '2026-01-27T19:00:00Z',
        gameVersionId: 'cdda-0.I',
        modCount: 0,
        sizeBytes: 1000,
      });

      // Act
      await createSnapshot({
        name: 'Test',
        includeSaves: false,
        description: 'テスト用スナップショット',
      });

      // Assert
      expect(invoke).toHaveBeenCalledWith('create_snapshot', {
        name: 'Test',
        include_saves: false,
        description: 'テスト用スナップショット',
      });
    });

    it('should throw SNAPSHOT_NAME_EXISTS error when name already exists', async () => {
      // Arrange
      const error: ApiError = {
        code: 'SNAPSHOT_NAME_EXISTS',
        message: 'Snapshot with this name already exists',
        userMessage: '同名のスナップショットが既に存在します',
        recoverable: true,
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(
        createSnapshot({ name: 'Existing Name', includeSaves: true })
      ).rejects.toMatchObject({ code: 'SNAPSHOT_NAME_EXISTS' });
    });

    it('should throw INVALID_NAME error for invalid characters', async () => {
      // Arrange
      const error: ApiError = {
        code: 'INVALID_NAME',
        message: 'Invalid characters in snapshot name',
        userMessage: 'スナップショット名に使用できない文字が含まれています',
        recoverable: true,
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(
        createSnapshot({ name: 'Invalid/Name', includeSaves: true })
      ).rejects.toMatchObject({ code: 'INVALID_NAME' });
    });

    it('should throw DISK_FULL error when storage is insufficient', async () => {
      // Arrange
      const error: ApiError = {
        code: 'DISK_FULL',
        message: 'Insufficient disk space',
        userMessage: 'ディスク容量が不足しています',
        recoverable: false,
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(
        createSnapshot({ name: 'New Snapshot', includeSaves: true })
      ).rejects.toMatchObject({ code: 'DISK_FULL' });
    });
  });

  // ----------------------------------------------------------
  // listSnapshots
  // ----------------------------------------------------------
  describe('listSnapshots', () => {
    it('should return array of snapshots', async () => {
      // Arrange
      const mockSnapshots: SnapshotSummary[] = [
        {
          id: 'Stable_0I_日本語環境',
          name: 'Stable 0.I + 日本語環境',
          createdAt: '2026-01-27T19:00:00Z',
          gameVersionId: 'cdda-0.I-2026-01-20-1811',
          modCount: 5,
          sizeBytes: 52428800,
        },
        {
          id: 'Experimental_テスト',
          name: 'Experimental テスト',
          createdAt: '2026-01-26T10:00:00Z',
          gameVersionId: 'cdda-exp-2026-01-25-0412',
          modCount: 3,
          sizeBytes: 31457280,
        },
      ];
      vi.mocked(invoke).mockResolvedValue(mockSnapshots);

      // Act
      const result = await listSnapshots();

      // Assert
      expect(invoke).toHaveBeenCalledWith('list_snapshots');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Stable 0.I + 日本語環境');
    });

    it('should return empty array when no snapshots exist', async () => {
      // Arrange
      vi.mocked(invoke).mockResolvedValue([]);

      // Act
      const result = await listSnapshots();

      // Assert
      expect(result).toEqual([]);
    });

    it('should return snapshots sorted by createdAt descending', async () => {
      // Arrange
      const mockSnapshots: SnapshotSummary[] = [
        {
          id: 'newer',
          name: 'Newer',
          createdAt: '2026-01-27T19:00:00Z',
          gameVersionId: 'cdda-0.I',
          modCount: 1,
          sizeBytes: 1000,
        },
        {
          id: 'older',
          name: 'Older',
          createdAt: '2026-01-26T10:00:00Z',
          gameVersionId: 'cdda-0.I',
          modCount: 1,
          sizeBytes: 1000,
        },
      ];
      vi.mocked(invoke).mockResolvedValue(mockSnapshots);

      // Act
      const result = await listSnapshots();

      // Assert
      expect(new Date(result[0].createdAt).getTime())
        .toBeGreaterThan(new Date(result[1].createdAt).getTime());
    });

    it('should throw IO_ERROR on directory read failure', async () => {
      // Arrange
      const error: ApiError = {
        code: 'IO_ERROR',
        message: 'Failed to read snapshots directory',
        userMessage: 'ディレクトリ読み取り中にエラーが発生しました',
        recoverable: true,
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(listSnapshots()).rejects.toMatchObject({ code: 'IO_ERROR' });
    });
  });

  // ----------------------------------------------------------
  // getSnapshot
  // ----------------------------------------------------------
  describe('getSnapshot', () => {
    it('should return snapshot detail by id', async () => {
      // Arrange
      const mockDetail: SnapshotDetail = {
        id: 'Stable_0I_日本語環境',
        name: 'Stable 0.I + 日本語環境',
        createdAt: '2026-01-27T19:00:00Z',
        gameVersionId: 'cdda-0.I-2026-01-20-1811',
        platform: 'macos',
        sizeBytes: 52428800,
        mods: [
          { id: 'cata_jp', name: 'Japanese Translation', version: '1.0.0' },
        ],
        hasSaves: true,
        isGameInstalled: true,
      };
      vi.mocked(invoke).mockResolvedValue(mockDetail);

      // Act
      const result = await getSnapshot('Stable_0I_日本語環境');

      // Assert
      expect(invoke).toHaveBeenCalledWith('get_snapshot', {
        snapshot_id: 'Stable_0I_日本語環境',
      });
      expect(result.mods).toHaveLength(1);
      expect(result.hasSaves).toBe(true);
    });

    it('should throw SNAPSHOT_NOT_FOUND for non-existent snapshot', async () => {
      // Arrange
      const error: ApiError = {
        code: 'SNAPSHOT_NOT_FOUND',
        message: 'Snapshot not found',
        userMessage: '指定されたスナップショットが見つかりません',
        recoverable: false,
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(getSnapshot('non-existent'))
        .rejects.toMatchObject({ code: 'SNAPSHOT_NOT_FOUND' });
    });
  });

  // ----------------------------------------------------------
  // deleteSnapshot
  // ----------------------------------------------------------
  describe('deleteSnapshot', () => {
    it('should call invoke with snapshot id', async () => {
      // Arrange
      const mockResult: DeleteResult = {
        deletedId: 'snap-1',
        freedBytes: 52428800,
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      // Act
      const result = await deleteSnapshot('snap-1');

      // Assert
      expect(invoke).toHaveBeenCalledWith('delete_snapshot', {
        snapshot_id: 'snap-1',
        force: undefined,
      });
      expect(result.deletedId).toBe('snap-1');
      expect(result.freedBytes).toBe(52428800);
    });

    it('should support force delete option', async () => {
      // Arrange
      vi.mocked(invoke).mockResolvedValue({
        deletedId: 'snap-1',
        freedBytes: 1000,
      });

      // Act
      await deleteSnapshot('snap-1', { force: true });

      // Assert
      expect(invoke).toHaveBeenCalledWith('delete_snapshot', {
        snapshot_id: 'snap-1',
        force: true,
      });
    });

    it('should throw SNAPSHOT_IS_ACTIVE error when deleting active snapshot', async () => {
      // Arrange
      const error: ApiError = {
        code: 'SNAPSHOT_IS_ACTIVE',
        message: 'Cannot delete active snapshot',
        userMessage: 'アクティブなスナップショットは削除できません',
        recoverable: false,
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(deleteSnapshot('active-snap'))
        .rejects.toMatchObject({ code: 'SNAPSHOT_IS_ACTIVE' });
    });

    it('should throw SNAPSHOT_NOT_FOUND for non-existent snapshot', async () => {
      // Arrange
      const error: ApiError = {
        code: 'SNAPSHOT_NOT_FOUND',
        message: 'Snapshot not found',
        userMessage: '指定されたスナップショットが見つかりません',
        recoverable: false,
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(deleteSnapshot('non-existent'))
        .rejects.toMatchObject({ code: 'SNAPSHOT_NOT_FOUND' });
    });
  });

  // ----------------------------------------------------------
  // restoreSnapshot
  // ----------------------------------------------------------
  describe('restoreSnapshot', () => {
    it('should restore snapshot with default options', async () => {
      // Arrange
      const mockResult: RestoreResult = {
        success: true,
        snapshotId: 'snap-1',
        gameDownloaded: false,
        modsRestored: 5,
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      // Act
      const result = await restoreSnapshot('snap-1');

      // Assert
      expect(invoke).toHaveBeenCalledWith('restore_snapshot', {
        snapshot_id: 'snap-1',
        restore_saves: undefined,
        backup_current: undefined,
      });
      expect(result.success).toBe(true);
      expect(result.modsRestored).toBe(5);
    });

    it('should support restore_saves option', async () => {
      // Arrange
      vi.mocked(invoke).mockResolvedValue({
        success: true,
        snapshotId: 'snap-1',
        gameDownloaded: false,
        modsRestored: 3,
      });

      // Act
      await restoreSnapshot('snap-1', { restoreSaves: false });

      // Assert
      expect(invoke).toHaveBeenCalledWith('restore_snapshot', {
        snapshot_id: 'snap-1',
        restore_saves: false,
        backup_current: undefined,
      });
    });

    it('should support backup_current option', async () => {
      // Arrange
      const mockResult: RestoreResult = {
        success: true,
        snapshotId: 'snap-1',
        gameDownloaded: false,
        modsRestored: 3,
        backupCreated: 'backup-001',
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      // Act
      const result = await restoreSnapshot('snap-1', { backupCurrent: true });

      // Assert
      expect(invoke).toHaveBeenCalledWith('restore_snapshot', {
        snapshot_id: 'snap-1',
        restore_saves: undefined,
        backup_current: true,
      });
      expect(result.backupCreated).toBe('backup-001');
    });

    it('should throw GAME_DOWNLOAD_REQUIRED when game is not installed', async () => {
      // Arrange
      const error: ApiError = {
        code: 'GAME_DOWNLOAD_REQUIRED',
        message: 'Game version needs to be downloaded',
        userMessage: 'ゲームのダウンロードが必要です',
        recoverable: true,
        details: { requiredVersion: 'cdda-0.I-2026-01-20-1811' },
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(restoreSnapshot('snap-1'))
        .rejects.toMatchObject({ code: 'GAME_DOWNLOAD_REQUIRED' });
    });
  });

  // ----------------------------------------------------------
  // renameSnapshot
  // ----------------------------------------------------------
  describe('renameSnapshot', () => {
    it('should rename snapshot', async () => {
      // Arrange
      vi.mocked(invoke).mockResolvedValue({
        id: 'snap-1',
        newName: 'New Name',
      });

      // Act
      const result = await renameSnapshot('snap-1', 'New Name');

      // Assert
      expect(invoke).toHaveBeenCalledWith('rename_snapshot', {
        snapshot_id: 'snap-1',
        new_name: 'New Name',
      });
      expect(result.newName).toBe('New Name');
    });

    it('should throw NAME_EXISTS when new name already exists', async () => {
      // Arrange
      const error: ApiError = {
        code: 'NAME_EXISTS',
        message: 'A snapshot with this name already exists',
        userMessage: '同名のスナップショットが既に存在します',
        recoverable: true,
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(renameSnapshot('snap-1', 'Existing Name'))
        .rejects.toMatchObject({ code: 'NAME_EXISTS' });
    });
  });

  // ----------------------------------------------------------
  // Error Handling (共通)
  // ----------------------------------------------------------
  describe('error handling', () => {
    it('should throw on API error with proper error structure', async () => {
      // Arrange
      const error: ApiError = {
        code: 'INTERNAL_UNEXPECTED',
        message: 'An unexpected error occurred',
        userMessage: '予期しないエラーが発生しました',
        recoverable: false,
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(listSnapshots()).rejects.toMatchObject({
        code: 'INTERNAL_UNEXPECTED',
        recoverable: false,
      });
    });

    it('should include details in error when available', async () => {
      // Arrange
      const error: ApiError = {
        code: 'VALIDATION_INVALID_NAME',
        message: 'Invalid characters: /, \\',
        userMessage: '名前に使用できない文字が含まれています',
        details: { invalidChars: ['/', '\\'] },
        recoverable: true,
      };
      vi.mocked(invoke).mockRejectedValue(error);

      // Act & Assert
      await expect(createSnapshot({ name: 'a/b', includeSaves: true }))
        .rejects.toMatchObject({
          code: 'VALIDATION_INVALID_NAME',
          details: { invalidChars: ['/', '\\'] },
        });
    });
  });
});

// ============================================================
// Storage API テスト
// ============================================================

describe('Storage API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStorageUsage', () => {
    it('should return storage usage information', async () => {
      // Arrange
      const mockUsage = {
        snapshotsTotalBytes: 1073741824, // 1GB
        gamesTotalBytes: 536870912, // 512MB
        totalBytes: 1610612736, // 1.5GB
        warningThresholdBytes: 5368709120, // 5GB
        isOverThreshold: false,
        diskFreeBytes: 107374182400, // 100GB
      };
      vi.mocked(invoke).mockResolvedValue(mockUsage);

      // Act
      const result = await getStorageUsage();

      // Assert
      expect(invoke).toHaveBeenCalledWith('get_storage_usage');
      expect(result.snapshotsTotalBytes).toBe(1073741824);
      expect(result.isOverThreshold).toBe(false);
    });
  });

  describe('cleanupOldSnapshots', () => {
    it('should perform dry run by default', async () => {
      // Arrange
      const mockResult = {
        dryRun: true,
        deletedCount: 2,
        freedBytes: 104857600, // 100MB
        deletedSnapshots: ['old-snap-1', 'old-snap-2'],
        keptSnapshots: ['recent-snap'],
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      // Act
      const result = await cleanupOldSnapshots({
        keepDays: 30,
        keepMinCount: 3,
      });

      // Assert
      expect(invoke).toHaveBeenCalledWith('cleanup_old_snapshots', {
        keep_days: 30,
        keep_min_count: 3,
        dry_run: true,
      });
      expect(result.dryRun).toBe(true);
      expect(result.deletedCount).toBe(2);
    });

    it('should actually delete when dryRun is false', async () => {
      // Arrange
      vi.mocked(invoke).mockResolvedValue({
        dryRun: false,
        deletedCount: 2,
        freedBytes: 104857600,
        deletedSnapshots: ['old-snap-1', 'old-snap-2'],
        keptSnapshots: ['recent-snap'],
      });

      // Act
      const result = await cleanupOldSnapshots({
        keepDays: 30,
        keepMinCount: 3,
        dryRun: false,
      });

      // Assert
      expect(invoke).toHaveBeenCalledWith('cleanup_old_snapshots', {
        keep_days: 30,
        keep_min_count: 3,
        dry_run: false,
      });
      expect(result.dryRun).toBe(false);
    });
  });
});

// ============================================================
// Game Version API テスト
// ============================================================

describe('Game Version API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listGameVersions', () => {
    it('should return installed game versions', async () => {
      // Arrange
      const mockVersions = {
        installed: [
          {
            id: 'cdda-0.I-2026-01-20-1811',
            releaseType: 'stable',
            releaseDate: '2026-01-20',
            platform: 'macos',
            isInstalled: true,
            installPath: '/path/to/game',
            sizeBytes: 268435456, // 256MB
          },
        ],
      };
      vi.mocked(invoke).mockResolvedValue(mockVersions);

      // Act
      const result = await listGameVersions();

      // Assert
      expect(invoke).toHaveBeenCalledWith('list_game_versions', {
        include_remote: false,
      });
      expect(result.installed).toHaveLength(1);
      expect(result.installed[0].isInstalled).toBe(true);
    });

    it('should include available versions when includeRemote is true', async () => {
      // Arrange
      const mockVersions = {
        installed: [],
        available: [
          {
            id: 'cdda-0.I-2026-01-20-1811',
            releaseType: 'stable',
            releaseDate: '2026-01-20',
            platform: 'macos',
            isInstalled: false,
            downloadUrl: 'https://example.com/download',
          },
        ],
      };
      vi.mocked(invoke).mockResolvedValue(mockVersions);

      // Act
      const result = await listGameVersions({ includeRemote: true });

      // Assert
      expect(invoke).toHaveBeenCalledWith('list_game_versions', {
        include_remote: true,
      });
      expect(result.available).toHaveLength(1);
      expect(result.available![0].isInstalled).toBe(false);
    });
  });
});

// ============================================================
// キャッシュ無効化テスト（TanStack Query連携）
// ============================================================

describe('Cache Invalidation', () => {
  it.skip('should invalidate snapshots cache after create', async () => {
    // TODO: TanStack Query hooks (useSnapshotMutations.ts) 実装後に有効化
  });

  it.skip('should invalidate storage cache after delete', async () => {
    // TODO: TanStack Query hooks 実装後に有効化
  });

  it.skip('should remove specific snapshot cache after delete', async () => {
    // TODO: TanStack Query hooks 実装後に有効化
  });
});
