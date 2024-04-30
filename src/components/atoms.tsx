"use client";

import { Atom, atom, PrimitiveAtom } from 'jotai';
import { createStore, Provider } from 'jotai';
import { atomWithStorage } from 'jotai/utils'
import { Mod } from "@/components/datatable/mod-table/table-mods";

// atomWithStorage
// ToDo: Remove this
const defaultModDataDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source";
const defaultGameModDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets";

const mods = atom<Mod[]>([]);
const modDataDirPath = atomWithStorage('modDataDir', defaultModDataDir);
const gameModDirPath = atomWithStorage('gameModDir', defaultGameModDir);

const store = createStore();

export {
  mods,
  modDataDirPath,
  gameModDirPath,
  store
}