"use client";

import React from "react";
import CSR from "@/components/csr/csr";
import { gameModDirPath, refreshMods } from "@/components/atoms";
import { useAtomValue, useAtom } from "jotai";
import { Mod, columns } from "./columns";
import { DataTable } from "./data-table";

export type getModsProps = {
  mods: Mod[];
}

function ModsTable({ mods }: getModsProps) {
  const gameModDir = useAtomValue(gameModDirPath);
  const [_, refresh] = useAtom(refreshMods);

  return (
    <CSR>
      <div className="container mx-auto">
        <DataTable
          columns={columns}
          data={mods}
          fetchMods={refresh}
          gameModDir={gameModDir}
        />
      </div>
    </CSR>
  )
}

export { ModsTable };
export type { Mod };