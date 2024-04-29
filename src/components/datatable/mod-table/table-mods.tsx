"use client";

import React from "react";
import Link from "next/link";

import { Mod, columns } from "./columns";
import { DataTable } from "./data-table";


import { fetchMods } from "@/lib/api";


export type getModsProps = {
  mods: Mod[];
  setMods: (mods: Mod[]) => void;
}

function ModsTable(
  {mods, setMods}: getModsProps
) {
  // const handleScanMods = () => getMods({ mods, setMods });
  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={mods}/>
    </div>
  )
}

export { ModsTable, fetchMods as getMods };
export type { Mod };