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

// https://github.com/CleverRaven/Cataclysm-DDA/blob/master/doc/MODDING.md
type ModInfo = {
  ident: string;
  name: string;
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
  {
    accessorKey: "info",
    header: "Mods",
    cell: ({ row }) => {
      const info: ModInfo = row.getValue("info");
      return (
          <div className="flex grid grid-cols-6 gap-x-2">
            <p className="col-span-6 text-base font-semibold">{info.name}</p>
            {

              Object.keys(info).map((k) => {
                const value = info[k as keyof ModInfo];
                const skipKeys = ['type', 'ident', 'name'];
                if (skipKeys.includes(k)) return null;
                if (Array.isArray(value)) {
                  return (value.join("").trim() != "") && (
                    <>
                      <p className="pl-2 col-span-2 text-xs font-semibold text-gray-600">{k}</p>
                      <p className="pl-2 col-span-4 text-xs text-gray-600">{value.join(", ")}</p>
                    </>
                  )
                }
                else {
                  return value && (
                    <>
                      <p className="pl-2 col-span-2 text-xs font-semibold text-gray-600">{k}</p>
                      <p className="pl-2 col-span-4 text-xs text-gray-600">{value}</p>
                    </>
                  )
                }


              })
            }
          </div>
      )
    }
  },
  {
    accessorKey: "localVersion",
    header: "バージョン管理",
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
                <p className="text-xs font-semibold text-gray-600">N/A</p>
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
          <Badge
            className="hover:cursor-pointer hover:scale-110"
            variant={is_installed ? "success" : "danger"}
            onClick={() => {
              // シムリンク作成
              // ステータスを更新
            }}
          >
            {is_installed ? "Active" : "Inactive"}
          </Badge>
        </>
      )
    }
  }
  // {
  //   accessorKey: "actions",
  //   header: "Actions",
  //   cell: ({ row }) => {
  //     const info: ModInfo = row.getValue("info");
  //     return (
  //       <>
  //       <DropdownMenu>
  //         <DropdownMenuTrigger asChild>
  //           <Button variant="ghost" className="h-8 w-8 p-0">
  //             <span className="sr-only">Open menu</span>
  //             <MoreHorizontal className="h-4 w-4" />
  //           </Button>
  //         </DropdownMenuTrigger>
  //         <DropdownMenuContent align="end">
  //           <DropdownMenuLabel>Actions</DropdownMenuLabel>
  //           <DropdownMenuItem
  //             onClick={() => navigator.clipboard.writeText(info.ident)}
  //           >
  //             Copy payment ID
  //           </DropdownMenuItem>
  //           <DropdownMenuSeparator />
  //           <DropdownMenuItem>View customer</DropdownMenuItem>
  //           <DropdownMenuItem>View payment details</DropdownMenuItem>
  //         </DropdownMenuContent>
  //       </DropdownMenu>
  //       </>
  //     )
  //   }
  // }
]
