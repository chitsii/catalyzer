"use client";

import React from "react";
import CSR from "@/components/csr/csr";
import { refreshModsAtom } from "@/components/atoms";
import { useAtom } from "jotai";
import { Mod, columns } from "./columns";
import { DataTable } from "./data-table";

export type getModsProps = {
  mods: Mod[];
};

function ModsTable({ mods }: getModsProps) {
  const [_, refresh] = useAtom(refreshModsAtom);

  return (
    <CSR>
      <div className="container mx-auto">
        <DataTable columns={columns} data={mods} fetchMods={refresh} />
      </div>
    </CSR>
  );
}

export { ModsTable };
export type { Mod };
