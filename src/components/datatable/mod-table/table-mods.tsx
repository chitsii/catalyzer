"use client";

import React from "react";
import { gameModDirPath, refreshMods } from "@/components/atoms";
import { useAtomValue, useAtom } from "jotai";
// import { Button } from "@/components/ui/button";
import { Mod, columns } from "./columns";
import { DataTable } from "./data-table";
import { fetchMods } from "@/lib/api";



export type getModsProps = {
  mods: Mod[];
  // setMods: React.Dispatch<React.SetStateAction<Mod[]>>;
}

function ModsTable(
  {
    mods,
    // setMods
  }: getModsProps
) {
  const gameModDir = useAtomValue(gameModDirPath);
  const [_, refresh] = useAtom(refreshMods);

  return (
    <div className="container mx-auto py-10">
      <DataTable
        columns={columns}
        data={mods}
        fetchMods={refresh}
        gameModDir={gameModDir}
      />
    </div>
  )
}

export { ModsTable, fetchMods as getMods };
export type { Mod };