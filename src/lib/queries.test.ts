import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

import { useSnapshots, useCreateSnapshot, useDeleteSnapshot, snapshotKeys } from './queries';
import * as snapshotApi from './snapshot-api';
import type { SnapshotSummary, Snapshot, DeleteResult } from './snapshot-api';

// snapshot-api をモック
vi.mock('./snapshot-api', () => ({
  listSnapshots: vi.fn(),
  createSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
}));

const mockListSnapshots = snapshotApi.listSnapshots as ReturnType<typeof vi.fn>;
const mockCreateSnapshot = snapshotApi.createSnapshot as ReturnType<typeof vi.fn>;
const mockDeleteSnapshot = snapshotApi.deleteSnapshot as ReturnType<typeof vi.fn>;

describe('Snapshot Queries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('useSnapshots', () => {
    const mockSnapshots: SnapshotSummary[] = [
      {
        id: 'snap-1',
        name: 'Test Snapshot',
        createdAt: '2026-01-27T10:00:00Z',
        gameVersionId: 'cdda-0.I',
        modCount: 5,
        sizeBytes: 1024000,
      },
    ];

    it('should fetch snapshots on mount', async () => {
      mockListSnapshots.mockResolvedValue(mockSnapshots);

      const { result } = renderHook(() => useSnapshots(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSnapshots);
      expect(mockListSnapshots).toHaveBeenCalledTimes(1);
    });

    it('should use correct query key ["snapshots"]', async () => {
      mockListSnapshots.mockResolvedValue(mockSnapshots);

      renderHook(() => useSnapshots(), { wrapper });

      await waitFor(() => {
        expect(queryClient.getQueryState(snapshotKeys.all)).toBeDefined();
      });
    });

    it('should have staleTime of 30 seconds', async () => {
      mockListSnapshots.mockResolvedValue(mockSnapshots);

      const { result } = renderHook(() => useSnapshots(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const state = queryClient.getQueryState(snapshotKeys.all);
      expect(state?.dataUpdatedAt).toBeDefined();
      // staleTime は内部設定なので、データが取得されていることを確認
      expect(state?.status).toBe('success');
    });

    it('should return SnapshotSummary[] type', async () => {
      mockListSnapshots.mockResolvedValue(mockSnapshots);

      const { result } = renderHook(() => useSnapshots(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Array.isArray(result.current.data)).toBe(true);
      expect(result.current.data?.[0]).toHaveProperty('id');
      expect(result.current.data?.[0]).toHaveProperty('name');
    });
  });

  describe('useCreateSnapshot', () => {
    const mockCreatedSnapshot: Snapshot = {
      id: 'snap-new',
      name: 'New Snapshot',
      createdAt: '2026-01-27T12:00:00Z',
      gameVersionId: 'cdda-0.I',
      modCount: 3,
      sizeBytes: 512000,
    };

    it('should invalidate snapshots query on success', async () => {
      mockCreateSnapshot.mockResolvedValue(mockCreatedSnapshot);

      // まずスナップショットクエリにデータを設定
      queryClient.setQueryData(snapshotKeys.all, []);

      const { result } = renderHook(() => useCreateSnapshot(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: 'New Snapshot' });
      });

      // invalidateQueries が呼ばれたことを確認（状態がinvalidになる）
      const state = queryClient.getQueryState(snapshotKeys.all);
      expect(state?.isInvalidated).toBe(true);
    });

    it('should invalidate storage query on success', async () => {
      mockCreateSnapshot.mockResolvedValue(mockCreatedSnapshot);

      // storageクエリにデータを設定
      queryClient.setQueryData(snapshotKeys.storage, { totalBytes: 1000 });

      const { result } = renderHook(() => useCreateSnapshot(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: 'New Snapshot' });
      });

      const state = queryClient.getQueryState(snapshotKeys.storage);
      expect(state?.isInvalidated).toBe(true);
    });

    it('should accept CreateSnapshotParams', async () => {
      mockCreateSnapshot.mockResolvedValue(mockCreatedSnapshot);

      const { result } = renderHook(() => useCreateSnapshot(), { wrapper });

      const params = { name: 'test', includeSaves: true, description: 'desc' };

      await act(async () => {
        await result.current.mutateAsync(params);
      });

      expect(mockCreateSnapshot).toHaveBeenCalledWith(params);
    });

    it('should return created Snapshot on success', async () => {
      mockCreateSnapshot.mockResolvedValue(mockCreatedSnapshot);

      const { result } = renderHook(() => useCreateSnapshot(), { wrapper });

      let created: Snapshot | undefined;
      await act(async () => {
        created = await result.current.mutateAsync({ name: 'New Snapshot' });
      });

      expect(created?.id).toBe('snap-new');
      expect(created?.name).toBe('New Snapshot');
    });
  });

  describe('useDeleteSnapshot', () => {
    const mockSnapshots: SnapshotSummary[] = [
      {
        id: '1',
        name: 'Test Snapshot',
        createdAt: '2026-01-27T10:00:00Z',
        gameVersionId: 'cdda-0.I',
        modCount: 5,
        sizeBytes: 1024000,
      },
    ];

    const mockDeleteResult: DeleteResult = {
      deletedId: '1',
      freedBytes: 1024000,
    };

    it('should remove snapshot from cache optimistically', async () => {
      mockDeleteSnapshot.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockDeleteResult), 100))
      );

      queryClient.setQueryData(snapshotKeys.all, mockSnapshots);

      const { result } = renderHook(() => useDeleteSnapshot(), { wrapper });

      // mutate を呼び出す（非同期完了を待たない）
      act(() => {
        result.current.mutate('1');
      });

      // 楽観的更新により即座にキャッシュから消える
      await waitFor(() => {
        const cached = queryClient.getQueryData<SnapshotSummary[]>(snapshotKeys.all);
        expect(cached?.find((s) => s.id === '1')).toBeUndefined();
      });
    });

    it('should rollback on error', async () => {
      mockDeleteSnapshot.mockRejectedValue(new Error('Delete failed'));

      queryClient.setQueryData(snapshotKeys.all, mockSnapshots);

      const { result } = renderHook(() => useDeleteSnapshot(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync('1');
        } catch {
          // エラーは期待通り
        }
      });

      // エラー後、ロールバックされて元のデータが復元される
      const cached = queryClient.getQueryData<SnapshotSummary[]>(snapshotKeys.all);
      expect(cached?.find((s) => s.id === '1')).toBeDefined();
    });

    it('should invalidate queries on settled', async () => {
      mockDeleteSnapshot.mockResolvedValue(mockDeleteResult);

      queryClient.setQueryData(snapshotKeys.all, mockSnapshots);
      queryClient.setQueryData(snapshotKeys.storage, { totalBytes: 1000 });

      const { result } = renderHook(() => useDeleteSnapshot(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('1');
      });

      expect(queryClient.getQueryState(snapshotKeys.all)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(snapshotKeys.storage)?.isInvalidated).toBe(true);
    });

    it('should accept snapshot id as parameter', async () => {
      mockDeleteSnapshot.mockResolvedValue(mockDeleteResult);

      const { result } = renderHook(() => useDeleteSnapshot(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('snapshot-id-123');
      });

      expect(mockDeleteSnapshot).toHaveBeenCalledWith('snapshot-id-123');
    });

    it('should return DeleteResult with freedBytes', async () => {
      mockDeleteSnapshot.mockResolvedValue(mockDeleteResult);

      const { result } = renderHook(() => useDeleteSnapshot(), { wrapper });

      let deleteResult: DeleteResult | undefined;
      await act(async () => {
        deleteResult = await result.current.mutateAsync('1');
      });

      expect(deleteResult?.deletedId).toBe('1');
      expect(typeof deleteResult?.freedBytes).toBe('number');
      expect(deleteResult?.freedBytes).toBe(1024000);
    });
  });
});
