"use client";

import React from "react";
import CSR from "@/components/csr/csr";
import { refreshModsAtom } from "@/components/atoms";
import { useAtom } from "jotai";
import { Mod, columns } from "./columns";
import { DataTable } from "./data-table";

import { useTranslation } from "@/i18n/config"; //"next-i18next";

export type getModsProps = {
  mods: Mod[];
};

function ModsTable({ mods }: getModsProps) {
  const [_, refresh] = useAtom(refreshModsAtom);
  const { t } = useTranslation();

  return (
    <CSR>
      <div className="container mx-auto">
        <DataTable columns={columns} data={mods} fetchMods={refresh} t={t} />
      </div>
    </CSR>
  );
}

export { ModsTable };
export type { Mod };
