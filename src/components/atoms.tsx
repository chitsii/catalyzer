"use client";

import { Atom, atom, PrimitiveAtom, useAtom } from 'jotai';
import { createStore, Provider } from 'jotai';
import { atomWithStorage } from 'jotai/utils'
import { fetchMods } from "@/lib/api";
import { atomWithSuspenseQuery } from 'jotai-tanstack-query';
import { atomWithQuery } from 'jotai-tanstack-query';
import { atomWithMutation } from 'jotai-tanstack-query';
import path from 'path';
import { listProfiles, getSettings } from "@/lib/api";


// atomWithStorage
// ToDo: Remove this
const defaultModDataDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source";
const defaultGameModDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets";

// class ProfilePath {
//   root: string;
//   mods: string;
//   config: string;
//   font: string;
//   save: string;
//   sound: string;
//   gfx: string;
//   constructor(root: string) {
//     if (!root) {
//       throw new Error('root path is required');
//     }
//     this.root = root;
//     this.mods = path.join(root, 'mods');
//     this.config = path.join(root, 'config');
//     this.font = path.join(root, 'font');
//     this.save = path.join(root, 'save');
//     this.sound = path.join(root, 'sound');
//     this.gfx = path.join(root, 'gfx');
//   }
// }

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

const refreshSettingState = atom(0);
const refreshSettingAtom = atom((get) => get(refreshSettingState), (get, set) => {
  set(refreshSettingState, (c) => c + 1);
});
const settingAtom = atomWithSuspenseQuery(
  (get) => ({
    queryKey: [get(refreshSettingState)],
    queryFn: async () => {
      const res = await getSettings();
      return res;
    }
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
  queryKey: ['mods', get(refreshState), get(modDataDirPath), get(gameModDirPath)],
  queryFn: async (func) => {
    const res = await fetchMods(get(modDataDirPath), get(gameModDirPath));
    return res ? res : [];
  },
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