"use client";

import { Atom, atom, PrimitiveAtom, useAtom } from 'jotai';
import { createStore, Provider } from 'jotai';
import { atomWithStorage } from 'jotai/utils'
import { fetchMods } from "@/lib/api";
import { atomWithQuery, atomWithSuspenseQuery } from 'jotai-tanstack-query';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';

import { exists, BaseDirectory } from '@tauri-apps/api/fs';
import { configDir } from '@tauri-apps/api/path';

// atomWithStorage
// ToDo: Remove this
const defaultModDataDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source";
const defaultGameModDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets";


class ProfilePath {
  root: string;
  mods: string;
  config: string;
  font: string;
  save: string;
  sound: string;
  gfx: string;
  constructor(root: string) {
    if (!root) {
      throw new Error('root path is required');
    }
    this.root = root;
    this.mods = path.join(root, 'mods');
    this.config = path.join(root, 'config');
    this.font = path.join(root, 'font');
    this.save = path.join(root, 'save');
    this.sound = path.join(root, 'sound');
    this.gfx = path.join(root, 'gfx');
  }
}

class Profile {
  id: string;
  name: string;
  gamePath: string;
  // modDataDirPath: string;
  profilePath: ProfilePath;
  activeMods: string[];
  branchName: string;
  theme?: string;

  constructor(
    name: string,
    gamePath: string,
    profilePath: string,
    activeMods: string[],
    branchName: string,
    theme?: string,
  ) {
    this.id = createId();
    this.name = name;
    this.gamePath = gamePath;
    this.profilePath = new ProfilePath(profilePath);
    this.activeMods = activeMods;
    this.branchName = branchName;
    this.theme = theme;
  }
}

const defaultProfile = new Profile(
  'default',
  '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/gameDir/Cataclysm.app',
  '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/profile',
  [],
  'experimental',
  'dark',
);

// const profiles = atomWithStorage<Profile[]>('profiles', [defaultProfile]);
const profiles = atom<Profile[]>([defaultProfile]);

const modDataDirPath = atomWithStorage('modDataDir', defaultModDataDir);
const gameModDirPath = atomWithStorage('gameModDir', defaultGameModDir);
const store = createStore();

const refreshState = atom(0);
const refreshMods = atom((get) => get(refreshState), (get, set) => {
  set(refreshState, (c) => c + 1);
});
const modsQ = atomWithSuspenseQuery((get) => ({
  queryKey: [get(refreshState), get(modDataDirPath), get(gameModDirPath)],
  queryFn: async (func) => {
    const res = await fetchMods(get(modDataDirPath), get(gameModDirPath));
    return res ? res : [];
  },
}))


export {
  profiles,
  modsQ,
  refreshMods,
  modDataDirPath,
  gameModDirPath,
  Profile,
  store
}