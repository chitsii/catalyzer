"use client";

import React from "react";
import { modDataDirPath, gameModDirPath } from "@/components/atoms";
import { useAtomValue } from "jotai";
// import { Button } from "@/components/ui/button";

import { Mod, columns } from "./columns";
import { DataTable } from "./data-table";


import { fetchMods } from "@/lib/api";


export type getModsProps = {
  mods: Mod[];
  setMods: React.Dispatch<React.SetStateAction<Mod[]>>;
}

function ModsTable(
  { mods, setMods }: getModsProps
) {
  const modDataDir = useAtomValue(modDataDirPath);
  const gameModDir = useAtomValue(gameModDirPath);
  const fetchModsFunc = async () => { await fetchMods(modDataDir, gameModDir, setMods) }

  return (
    <div className="container mx-auto py-10">
      <DataTable
        columns={columns}
        data={mods}
        fetchMods={fetchModsFunc}
        gameModDir={gameModDir}
      />
    </div>
  )
}

export { ModsTable, fetchMods as getMods };
export type { Mod };