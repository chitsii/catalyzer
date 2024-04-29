"use client";

import React from "react";
import Link from "next/link";

import { Mod, columns } from "./columns";
import { DataTable } from "./data-table";


import { getMods } from "@/lib/api";


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


export function getMockData(): Mod[] {
  return [
    {
      info: {
          type: "MOD_INFO",
          ident: "FAST_Travel",
          name: "ファストトラベルMOD",
          authors: [ "m"],
          description: "事前に指定した場所に移動（ワープ）できるMODです。製作から専用のアイテムを作成してください。",
          category: "SUPPLEMENTAL",
          dependencies: [ "dda" ]
      },
      localVersion: null,
      isInstalled: true,
      localPath: ""
    },
    {
      info: {
        "type": "MOD_INFO",
        "ident": "disable_cbm_slot",
        "name": "削除 - CBMスロット",
        "authors": [
            "a", "b"
        ],
        "maintainers": [
            ""
        ],
        "description": "",
        "dependencies": [
            "dda"
        ]
      },
      localVersion: {
        branchName: "main",
        lastCommitDate: "2021-08-02"
      },
      isInstalled: true,
      localPath: ""
    },
    {
      info: {
        "type": "MOD_INFO",
        "ident": "crimm_sidebar",
        "name": "クリム式サイドバー",
        "authors": [ "Crimm" ],
        "description": "必要なものを狭い範囲に詰め込めるだけ詰め込んだサイドバーです。略語が多いのである程度ゲームに慣れた人向けです。",
        "version": "230225",
        "dependencies": [ "dda" ]
      },
      localVersion: {
        branchName: "main",
        lastCommitDate: "2021-08-02"
      },
      isInstalled: false,
      localPath: ""
    },
    {
      info: {
        "type": "MOD_INFO",
        "ident": "honwaka",
        "name": "変更 - ほんわかmod",
        "authors": [ "YasuYasu" ] ,
        "maintainers": [ "YasuYasu" ] ,
        "description": "現状のバランスを少し緩やかにします",
        "category": "rebalance",
        "dependencies": [ "dda" ],
        "version": "0.95"
      },
      localVersion: {
        branchName: "main",
        lastCommitDate: "2021-08-02"
      },
      isInstalled: true,
      localPath: ""
    }
  ]
}

export { ModsTable, getMods };
export type { Mod };