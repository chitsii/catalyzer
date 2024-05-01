"use client";

import { Atom, atom, PrimitiveAtom, useAtom } from 'jotai';
import { createStore, Provider } from 'jotai';
import { atomWithStorage } from 'jotai/utils'
import { Mod } from "@/components/datatable/mod-table/table-mods";
import { fetchMods } from "@/lib/api";
import { atomWithQuery, atomWithSuspenseQuery } from 'jotai-tanstack-query';

// atomWithStorage
// ToDo: Remove this
const defaultModDataDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source";
const defaultGameModDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets";

// const mods = atom<Mod[]>([]);
const modDataDirPath = atomWithStorage('modDataDir', defaultModDataDir);
const gameModDirPath = atomWithStorage('gameModDir', defaultGameModDir);
const lastOpenTab = atomWithStorage('lastOpenTab', 'setting');
const store = createStore();

const refreshState = atom(0);
const refreshMods = atom((get) => get(refreshState), (get, set) => {
  set(refreshState, (c) => c + 1);
});
const modsQ = atomWithSuspenseQuery((get) => ({
  queryKey: [get(refreshState), get(modDataDirPath), get(gameModDirPath)],
  queryFn: async () => {
    const res = await fetchMods(get(modDataDirPath), get(gameModDirPath));
    return res;
  },
}))




export {
  // mods,
  modsQ,
  refreshMods,
  modDataDirPath,
  gameModDirPath,
  lastOpenTab,
  store
}