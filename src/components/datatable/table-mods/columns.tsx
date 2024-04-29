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
import { isEmptyArray, isUnemptyStringOrArray } from "@/lib/utils";

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
              <p className="text-sm font-semibold">{info.name}</p>
            )
          }
          {/* {
            info.id ? (<p className="text-[9px] text-gray-600">{info.id}</p>) : (
              <p className="text-[9px] text-gray-600">{info.ident}</p>
            )
          } */}
          {
            (isUnemptyStringOrArray(info.authors)) && (
              <p className="text-xs text-gray-600">作成者 {info.authors}</p>
            )
          }
          {
            (isUnemptyStringOrArray(info.maintainers)) && (
              <p className="text-xs text-gray-600">メンテナ {info.maintainers}</p>
            )
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
                {
                  info.category &&
                  (<Badge variant="category" className="text-xs uppercase">{info.category}</Badge>)
                }
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
                {/* <p className="text-xs font-semibold text-gray-600">未管理 */}
                <Button
                  variant="notInstalled"
                  size="sm"
                  className="ml-2 text-[10px]"
                  onClick={() => {
                    console.log(`start managing section: ${JSON.stringify(row.original.info)}`)
                  }}
                >
                  断面管理する
                </Button>
                {/* </p> */}
              </>
            )
          }
        </div>
      )
    }
  },
  {
    accessorKey: "is_installed",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
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
                {is_installed ? "導入済み" : "未導入"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">変更</DropdownMenuLabel>
              <DropdownMenuItem>インストール</DropdownMenuItem>
              <DropdownMenuItem>アンインストール</DropdownMenuItem>
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
