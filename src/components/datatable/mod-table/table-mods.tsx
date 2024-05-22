"use client";

import React from "react";
import CSR from "@/components/csr/csr";
import { activeProfileAtom, settingAtom, refreshModsAtom } from "@/components/atoms";
import { useAtomValue, useAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { Mod, columns } from "./columns";
import { DataTable } from "./data-table";

export type getModsProps = {
  mods: Mod[];
}

function ModsTable({ mods }: getModsProps) {
  const [{ data: settings }] = useAtom(settingAtom);
  const [_, refresh] = useAtom(refreshModsAtom);

  return (
    <CSR>
      <div className="container mx-auto">
        <DataTable
          columns={columns}
          data={mods}
          fetchMods={refresh}
          gameModDir={settings.game_config_path.mods}
        />
      </div>
    </CSR>
  )
}

export { ModsTable };
export type { Mod };