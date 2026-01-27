"use client";

import { Atom, atom, PrimitiveAtom, useAtom, useAtomValue } from "jotai";
import { createStore, Provider } from "jotai";
import { Mod } from "@/components/datatable/mod-table/columns";
import { listMods } from "@/lib/api";
import { atomWithSuspenseQuery } from "jotai-tanstack-query";

import { getSettings } from "@/lib/api";

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

const refreshSettingState = atom(0);
const refreshSettingAtom = atom(
  (get) => get(refreshSettingState),
  (get, set) => {
    set(refreshSettingState, (c) => c + 1);
  },
);
const settingAtom = atomWithSuspenseQuery((get) => ({
  queryKey: [get(refreshSettingState)],
  queryFn: async () => {
    const res = await getSettings();
    return res;
  },
  retry: 10,
  retryDelay: 500,
  staleTime: Infinity,
  refetchOnMount: "always",
}));
const activeProfileAtom = atom(async (get) => {
  const { data: settings } = await get(settingAtom);
  if (!settings) return null;
  const res = settings.profiles.find((p) => p.is_active);
  return res;
});

const refreshState = atom(0);
const refreshModsAtom = atom(
  (get) => get(refreshState),
  (get, set) => {
    set(refreshState, (c) => c + 1);
  },
);
const modsAtom = atomWithSuspenseQuery((get) => ({
  queryKey: ["mods", get(refreshState), get(activeProfileAtom)],
  queryFn: async () => {
    const res = await listMods();
    return res;
  },
  staleTime: Infinity,
  refetchOnMount: "always",
}));

const logTextAtom = atom<String[]>([]);

const store = createStore();

// ============================================================
// Snapshot Atoms（スナップショット機能用）
// ============================================================

/** スナップショットサマリー型 */
type SnapshotSummary = {
  id: string;
  name: string;
  createdAt: string;
  gameVersionId: string;
  modCount: number;
  sizeBytes: number;
};

/** タブID型 */
type TabId = "snapshots" | "mods" | "settings";

/** ダイアログ状態型 */
type DialogState = {
  type: "confirm" | "capacity-warning" | "snapshot-create" | "snapshot-edit" | "mod-add" | null;
  props: Record<string, unknown> | null;
};

/** スナップショット一覧 */
const snapshotsAtom = atom<SnapshotSummary[]>([]);

/** 選択中のスナップショットID */
const activeSnapshotIdAtom = atom<string | null>(null);

/** 選択中のスナップショット（派生atom） */
const currentSnapshotAtom = atom((get) => {
  const id = get(activeSnapshotIdAtom);
  const snapshots = get(snapshotsAtom);
  if (!id) return null;
  return snapshots.find((s) => s.id === id) ?? null;
});

/** ストレージ使用状況（派生atom） */
const storageUsageAtom = atom((get) => {
  const snapshots = get(snapshotsAtom);
  return {
    totalBytes: snapshots.reduce((sum, s) => sum + s.sizeBytes, 0),
    count: snapshots.length,
  };
});

/** アクティブタブ */
const activeTabAtom = atom<TabId>("snapshots");

/** 未保存変更フラグ */
const hasUnsavedChangesAtom = atom<boolean>(false);

/** ダイアログ状態 */
const dialogStateAtom = atom<DialogState>({
  type: null,
  props: null,
});

// ============================================================
// Exports
// ============================================================

export {
  // 既存Atoms
  settingAtom,
  refreshSettingAtom,
  modsAtom,
  refreshModsAtom,
  activeProfileAtom,
  logTextAtom,
  store,
  // 新規Snapshot Atoms
  snapshotsAtom,
  activeSnapshotIdAtom,
  currentSnapshotAtom,
  storageUsageAtom,
  activeTabAtom,
  hasUnsavedChangesAtom,
  dialogStateAtom,
};

export type { Profile, Settings, SnapshotSummary, TabId, DialogState };
