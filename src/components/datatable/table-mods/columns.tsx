"use client"

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { DataTableColumnHeader } from "@/components/datatable/header";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isNonEmptyStringOrArray } from "@/lib/utils";

import {
  fListModDirs,
  fListSymLinks,
  fCreateSymlink,
  createSymlink,
  fRemoveSymlink,
  fCreateAllSymlinks,
  fRemoveAllSymlink,
  GitCmdBase,
  getMods,
  openLocalDir
} from "@/lib/api";
import { init } from "next/dist/compiled/webpack/webpack";


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
    cell: ({ row }) => {
      return (
        <p className="text-xs text-gray-600">{row.index + 1}</p>
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
              <p
                className="text-sm font-bold text-blue-800 cursor-pointer hover:underline"
                onClick={()=>{
                  console.log(`opne locally: ${info.name}`)
                  openLocalDir(row.original.localPath)
                }}
              >
                {info.name}
              </p>
            )
          }
          {
            (isNonEmptyStringOrArray(info.authors)) && (
              <p className="text-xs text-gray-600">作成者 {info.authors}</p>
            )
          }
          {
            (isNonEmptyStringOrArray(info.maintainers)) && (
              <p className="text-xs text-gray-600">メンテナ {info.maintainers}</p>
            )
          }
          {
            info.category &&
            (<Badge variant="category">{info.category}</Badge>)
          }
        </div>
      )
    }
  },
  {
    accessorKey: "info",
    header: "Description",
    cell: ({ row }) => {
      const info: ModInfo = row.getValue("info");
      if (info == null) return null;
      return (
        <>
          {
            info.description && (
              <div>
                <p className="text-xs text-gray-600">{info.description}</p>
              </div>
            )
          }
          <div>
            {
              Object.keys(info).map((k) => {
                const value = info[k as keyof ModInfo];
                // 前のカラムで表示済み
                const skipKeys = ['type', 'ident', 'id', 'name', 'authors', 'maintainers', 'dependencies', 'category', 'description', 'description'];

                if (skipKeys.includes(k)) return null;
                if (Array.isArray(value)) {
                  return (value.join("").trim() != "") && (
                    <>
                      <p>
                        <span className="text-xs font-semibold text-gray-600 uppercase">{k}: </span>
                        <span className="text-xs text-gray-600">{value.join(", ")}</span>
                      </p>
                    </>
                  )
                }
                else {
                  return value && (
                    <>
                      <span className="text-xs font-semibold text-gray-600 uppercase">{k}: </span>
                      <span className="text-xs text-gray-600">{value}</span>
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
    cell: ({ row }) => {
      const local_version: LocalVersion = row.getValue("localVersion");
      return (
        <div>
          {
            local_version ? (
              <>
                <p className="text-xs font-semibold text-gray-600">ブランチ</p>
                <p className="text-xs text-gray-600">{local_version.branchName}</p>
                <br />
                <p className="text-xs font-semibold text-gray-600">最終編集日</p>
                <p className="text-xs text-gray-600">{local_version.lastCommitDate}</p>
              </>
            ) : (
              <>
                <Button
                  variant="notInstalled"
                  size="sm"
                  className="ml-2 text-[10px]"
                  onClick={() => {
                    // console.log(`start managing section: ${JSON.stringify(row.original.info)}`)
                    console.log(`start managing section: ${JSON.stringify(row.original.localPath)}`)
                    const localPath = row.original.localPath;
                    GitCmdBase(localPath)("init_local_repository");
                  }}
                >
                  断面管理する
                </Button>
              </>
            )
          }
        </div>
      )
    }
  },
  {
    accessorKey: "is_installed",
    header: "Status",
    cell: ({ row }) => {
      const is_installed: boolean = row.getValue("is_installed");
      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={is_installed ? "installed" : "notInstalled"}
                size="sm"
              >
                {is_installed ? "Installed" : "Not Installed"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={
                () => {
                  const toggleInstall = () => {
                    if (is_installed) {
                      console.log(`uninstall: ${row.original.info.name}`);

                      const targetDir = "";
                      createSymlink(row.original.localPath, targetDir);

                    } else {
                      console.log(`install: ${row.original.info.name}`)
                    }
                  }
                }

              }>
                {is_installed ? "Uninstall" : "Install"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )
    }
  },
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={
  //         table.getIsAllPageRowsSelected() ||
  //         (table.getIsSomePageRowsSelected() && "indeterminate")
  //       }
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="Select all"
  //     />
  //   ),
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
