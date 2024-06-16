"use client";

import { Atom, atom, PrimitiveAtom, useAtom, useAtomValue } from "jotai";
import { createStore, Provider } from "jotai";
import { Mod } from "@/components/datatable/mod-table/columns";
import { atomWithStorage } from "jotai/utils";
import { fetchMods } from "@/lib/api";
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
    // FIXME: asyncにしてリフレッシュを待てるようにする
    set(refreshSettingState, (c) => c + 1);
  },
);
const settingAtom = atomWithSuspenseQuery((get) => ({
  enabled: typeof window !== "undefined",
  queryKey: [get(refreshSettingState)],
  queryFn: async () => {
    const res = await getSettings();
    return res;
  },
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
  enabled: typeof window === "undefined",
  queryKey: ["mods", get(refreshState), get(activeProfileAtom)],
  queryFn: async () => {
    return fetchMods();
  },
  staleTime: Infinity,
  refetchOnMount: "always",
}));

const logTextAtom = atom<String[]>([]);

const store = createStore();

export { settingAtom, refreshSettingAtom, modsAtom, refreshModsAtom, activeProfileAtom, logTextAtom, store };
export type { Profile, Settings };
