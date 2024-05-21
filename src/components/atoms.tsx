"use client";

import { Atom, atom, PrimitiveAtom, useAtom } from 'jotai';
import { createStore, Provider } from 'jotai';
import { atomWithStorage } from 'jotai/utils'
import { fetchMods } from "@/lib/api";
import { atomWithSuspenseQuery } from 'jotai-tanstack-query';
import { getSettings } from "@/lib/api";

// atomWithStorage
// ToDo: Remove this
const defaultModDataDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source";
const defaultGameModDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets";

type ProfilePath = {
  root: string;
  mods: string;
  config: string;
  font: string;
  save: string;
  sound: string;
  gfx: string;
}

type Profile = {
  id: string;
  name: string;
  game_path: string;
  profile_path: ProfilePath;
  active_mods: string[];
  branch_name: string;
  theme?: string;
  is_active?: boolean;
}

type Settings = {
  language: string;
  profile: Profile[];
}

declare global {
  interface Window {
    invoke: any;
    popUp: any;
    createId: any;
  }
}


const refreshSettingState = atom(0);
const refreshSettingAtom = atom((get) => get(refreshSettingState), (get, set) => {
  set(refreshSettingState, (c) => c + 1);
});
const settingAtom = atomWithSuspenseQuery(
  (get) => ({
    enabled: typeof window !== "undefined",
    queryKey: [get(refreshSettingState)],
    queryFn: async () => {
      return getSettings();
    },
    staleTime: Infinity,
    refetchOnMount: "always",
  })
);


// const defaultProfile = new Profile(
//   'default',
//   '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/gameDir/Cataclysm.app',
//   '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/profile',
//   [],
//   'experimental',
//   'dark',
// );

// const profiles = atomWithStorage<Profile[]>('profiles', [defaultProfile]);
// const profiles = atom<Profile[]>([defaultProfile]);


const modDataDirPath = atomWithStorage('modDataDir', defaultModDataDir);
const gameModDirPath = atomWithStorage('gameModDir', defaultGameModDir);
const store = createStore();

const refreshState = atom(0);
const refreshMods = atom((get) => get(refreshState), (get, set) => {
  set(refreshState, (c) => c + 1);
});
const modsAtom = atomWithSuspenseQuery((get) => ({
  enabled: typeof window === "undefined",
  queryKey: ['mods', get(refreshState), get(modDataDirPath), get(gameModDirPath)],
  queryFn: async () => {
    return fetchMods(get(modDataDirPath), get(gameModDirPath));
  },
  staleTime: Infinity,
  refetchOnMount: "always",
}))


export {
  // profiles,
  settingAtom,
  refreshSettingAtom,
  modsAtom,
  refreshMods,
  modDataDirPath,
  gameModDirPath,
  // Profile,
  store
}
export type {
  Profile,
  Settings
}