/**
 * TanStack Query カスタムフック
 *
 * スナップショット関連のデータ取得・更新を行うReact Query フック群。
 *
 * @see /docs/investigation/E_ui_component_design.md - TanStack Query設計
 * @see /docs/investigation/D_api_design.md - キャッシュ戦略
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSnapshots,
  createSnapshot,
  deleteSnapshot,
  type SnapshotSummary,
  type Snapshot,
  type DeleteResult,
  type CreateSnapshotParams,
} from './snapshot-api';

// ============================================================
// Query Keys
// ============================================================

export const snapshotKeys = {
  all: ['snapshots'] as const,
  detail: (id: string) => ['snapshot', id] as const,
  storage: ['storage'] as const,
};

// ============================================================
// useSnapshots
// ============================================================

/**
 * スナップショット一覧を取得するフック
 *
 * @returns TanStack Query の useQuery 結果
 * @example
 * const { data, isLoading, error } = useSnapshots();
 */
export function useSnapshots() {
  return useQuery({
    queryKey: snapshotKeys.all,
    queryFn: () => listSnapshots(),
    staleTime: 30 * 1000, // 30秒
    gcTime: 5 * 60 * 1000, // 5分
  });
}

// ============================================================
// useCreateSnapshot
// ============================================================

/**
 * スナップショットを作成するミューテーションフック
 *
 * 成功時に snapshots と storage クエリを無効化する。
 *
 * @returns TanStack Query の useMutation 結果
 * @example
 * const { mutate, mutateAsync } = useCreateSnapshot();
 * await mutateAsync({ name: 'My Snapshot', includeSaves: true });
 */
export function useCreateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateSnapshotParams) => createSnapshot(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.storage });
    },
  });
}

// ============================================================
// useDeleteSnapshot
// ============================================================

/**
 * スナップショットを削除するミューテーションフック
 *
 * 楽観的更新を行い、エラー時はロールバックする。
 * 成功/失敗に関わらず最終的にクエリを無効化して再取得する。
 *
 * @returns TanStack Query の useMutation 結果
 * @example
 * const { mutate, mutateAsync } = useDeleteSnapshot();
 * await mutateAsync('snapshot-id');
 */
export function useDeleteSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSnapshot(id),

    // 楽観的更新
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: snapshotKeys.all });

      const previous = queryClient.getQueryData<SnapshotSummary[]>(snapshotKeys.all);

      queryClient.setQueryData<SnapshotSummary[]>(
        snapshotKeys.all,
        (old) => old?.filter((s) => s.id !== id) ?? []
      );

      return { previous };
    },

    // エラー時ロールバック
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(snapshotKeys.all, context.previous);
      }
    },

    // 最終的に再取得
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.storage });
    },
  });
}
