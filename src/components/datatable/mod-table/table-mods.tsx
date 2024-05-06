"use client";

import React from "react";
import { gameModDirPath, refreshMods } from "@/components/atoms";
import { useAtomValue, useAtom } from "jotai";
import { Mod, columns } from "./columns";

// import dynamic from "next/dynamic";
// const columns = dynamic(
//   () => import("./columns").then((mod) => mod.columns), { ssr: false }
// );

import { DataTable } from "./data-table";

export type getModsProps = {
  mods: Mod[];
}

function ModsTable({ mods }: getModsProps) {
  const gameModDir = useAtomValue(gameModDirPath);
  const [_, refresh] = useAtom(refreshMods);

  return (
    <div className="container mx-auto">
      <DataTable
        columns={columns}
        data={mods}
        fetchMods={refresh}
        gameModDir={gameModDir}
      />
    </div>
  )
}

export { ModsTable };
export type { Mod };