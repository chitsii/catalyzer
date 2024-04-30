"use client"
import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { GitGraphIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import path from "path";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isNonEmptyStringOrArray } from "@/lib/utils";
import {
  createSymlink,
  removeSymlink,
  GitCmdBase,
  openLocalDir,
} from "@/lib/api";



import { RowData } from '@tanstack/react-table';
declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    fetchMods: (() => void),
    gameModDir: string,
  }
}

type ModInfo = {
  id?: string;
  ident?: string; // このプロパティはidが存在しない場合に使用
  name?: string;
  authors: string[];
  description: string;
  category?: string;
  dependencies: string[];
  type?: string;
  maintainers?: string[];
  version?: string;
}

type LocalVersion = {
  branchName: string;
  lastCommitDate: string | null;
}

export type Mod = {
  info: ModInfo;
  localVersion: LocalVersion | null;
  isInstalled: boolean;
  localPath: string;
}

export const columns: ColumnDef<Mod>[] = [
  {
    accessorKey: "rowIndex",
    header: "#",
    enableResizing: false,
    cell: ({ row }) => {
      return (
        <p className="text-xs">{row.index + 1}</p>
      )
    }
  },
  {
    accessorKey: "name",
    header: "Name",
    enableResizing: true,
    cell: ({ row }) => {
      const info: ModInfo = row.getValue("info");
      if (info == null) return null;
      return (
        <div>
          {
            info.name && (
              <div>
              <p
                className="text-sm text-primary hover:font-bold cursor-pointer hover:underline"
                onClick={() => {
                  console.log(`opne locally: ${info.name}`)
                  openLocalDir(row.original.localPath)
                }}
              >
                {info.name}
              </p>
              </div>
            )
          }
          {
            (isNonEmptyStringOrArray(info.authors)) && (
              <p className="text-xs text-muted-foreground">作成者 {info.authors}</p>
            )
          }
          {
            (isNonEmptyStringOrArray(info.maintainers)) && (
              <p className="text-xs text-muted-foreground">メンテナ {info.maintainers}</p>
            )
          }
          {
            info.category &&
            (<Badge variant="category">{info.category}</Badge>)
          }
          {/* <LucideCopy size={16} className="m-2"/> */}
        </div>
      )
    }
  },
  {
    accessorKey: "info",
    header: "Description",
    enableResizing: true,
    cell: ({ row }) => {
      const info: ModInfo = row.getValue("info");
      if (info == null) return null;
      return (
        <>
          {
            info.description && (
              <div>
                <p className="text-xs text-muted-foreground">{info.description}</p>
              </div>
            )
          }
          <div>
            {
              Object.keys(info).map((k) => {
                const value = info[k as keyof ModInfo];
                // 前のカラムで表示済み
                const skipKeys = ['type', 'ident', 'id', 'name', 'authors', 'maintainers', 'category', 'description'];

                if (skipKeys.includes(k)) return null;
                if (Array.isArray(value)) {
                  return (value.join("").trim() != "") && (
                    <>
                      <p>
                        <span className="text-xs font-semibold text-muted-foreground uppercase">{k}: </span>
                        <span className="text-xs text-muted-foreground">{value.join(", ")}</span>
                      </p>
                    </>
                  )
                }
                else {
                  return value && (
                    <>
                      <span className="text-xs font-semibold text-muted-foreground uppercase">{k}: </span>
                      <span className="text-xs text-muted-foreground">{value}</span>
                    </>
                  )
                }
              })
            }
          </div>
        </>
      )
    }
  },
  {
    accessorKey: "localVersion",
    header: "断面管理",
    enableResizing: true,
    cell: ({ row, table }) => {
      const local_version: LocalVersion = row.getValue("localVersion");
      return (
        <div>
          {
            local_version ? (
              <>
                <p className="text-xs font-semibold text-muted-foreground">ブランチ</p>
                <p className="text-xs text-muted-foreground">{local_version.branchName}</p>
                <br />
                <p className="text-xs font-semibold text-muted-foreground">最終編集日</p>
                <p className="text-xs text-muted-foreground">{local_version.lastCommitDate}</p>
              </>
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="notInstalled"
                      size="sm"
                      className="ml-2 text-[10px]"
                    >
                      N/A
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        console.log(`start managing section: ${JSON.stringify(row.original.localPath)}`)
                        const localPath = row.original.localPath;
                        GitCmdBase(localPath)("init_local_repository");

                        // reload table
                        const f = table.options.meta?.fetchMods;
                        if (f) f();
                      }}
                    >
                      <div className="flex gap-1"><GitGraphIcon size={16} />断面管理を始める</div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )
          }
        </div>
      )
    }
  },
  {
    accessorKey: "isInstalled",
    header: "Status",
    enableResizing: true,
    cell: ({ row, table }) => {
      const isInstalled: boolean = row.getValue("isInstalled");
      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isInstalled ? "installed" : "notInstalled"}
                size="sm"
              >
                {isInstalled ? "Installed" : "Not Installed"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={
                () => {
                  const targetDir = table.options.meta?.gameModDir;
                  const base = path.parse(row.original.localPath).base;

                  if (!targetDir || targetDir == "") {
                    console.error("target directory is not set!");
                    return
                  };
                  const targetModDir = path.join(targetDir, base);

                  if (isInstalled) {
                    console.log(`uninstall: ${row.original.info.name}`);
                    removeSymlink(targetModDir);
                  } else {
                    createSymlink(row.original.localPath, targetModDir);
                  }
                  // reload table
                  const f = table.options.meta?.fetchMods;
                  if (f) f();
                }
              }>
                {isInstalled ? "Uninstall" : "Install"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )
    }
  },
  // {
  //   id: "select",
  //   header: ({ table }) =>
  // {
  // table.options.meta?.fetchMods();
  // }
  // (
  // <Checkbox
  //   checked={
  //     table.getIsAllPageRowsSelected() ||
  //     (table.getIsSomePageRowsSelected() && "indeterminate")
  //   }
  //   onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //   aria-label="Select all"
  // />
  // ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //       aria-label="Select row"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
]
