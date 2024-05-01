"use client"
import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { GitGraphIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import path from "path";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isNonEmptyStringOrArray } from "@/lib/utils";
import {
  createSymlink,
  removeSymlink,
  GitCmdBase,
  openLocalDir,
} from "@/lib/api";
import { open } from '@tauri-apps/api/dialog';
import { downloadDir } from '@tauri-apps/api/path';


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
    accessorKey: "name",
    header: "Name",
    enableResizing: false,
    size: 50,
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
    },
    filterFn: (row, id, filterValues) => {
      const userInfoString = [
        row.original.info.id,
        row.original.info.ident,
        row.original.info.name,
        row.original.info.authors,
        row.original.info.maintainers,
        row.original.info.category,
        row.original.info.description,
        row.original.info.dependencies
      ].filter(Boolean).join(' ').toLowerCase();
      let searchTerms = Array.isArray(filterValues) ? filterValues : [filterValues];
      return searchTerms.some(term => userInfoString.includes(term.toLowerCase()));
    },
  },
  {
    accessorKey: "info",
    header: "Description",
    size: 50,
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
                    <p key={k}>
                      <span className="text-xs font-semibold text-muted-foreground uppercase">{k}: </span>
                      <span className="text-xs text-muted-foreground">{value.join(", ")}</span>
                    </p>
                  )
                }
                else {
                  return value && (
                    <p key={k}>
                      <span className="text-xs font-semibold text-muted-foreground uppercase">{k}: </span>
                      <span className="text-xs text-muted-foreground">{value}</span>
                    </p>
                  )
                }
              }

              )
            }

          </div>
        </>
      )
    }
  },
  {
    accessorKey: "localVersion",
    header: "Version For",
    size: 50,
    cell: ({ row, table }) => {
      const local_version: LocalVersion = row.getValue("localVersion");
      return (
        <div>
          {
            local_version ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="notInstalled"
                      size="sm"
                      className="ml-2 text-[10px]"
                    >
                      {local_version.branchName}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="grid grid-cols-2"
                      onClick={(e) => {
                        // キャンセル
                        e.preventDefault();
                      }}
                    >
                      <p className="col-span-3">バージョン変更</p>
                      <div className="col-span-2 min-w-32">
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="選択..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">experimental_20240501</SelectItem>
                            <SelectItem value="dark">0.G</SelectItem>
                            <SelectItem value="system">0.H</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="col-span-1">OK</Button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.preventDefault(); }}>
                      <Dialog>
                        <DialogTrigger>
                          <div className="flex gap-1"><GitGraphIcon size={16} />新規断面を作成</div>
                        </DialogTrigger>
                        <DialogContent onInteractOutside={(e) => { e.preventDefault(); }}>
                          <DialogHeader>
                            <DialogTitle>新規断面作成ダイアログ</DialogTitle>
                            <DialogDescription>
                              新規のブランチ名とModのzipファイルを選択してください。
                              <p className="text-xs text-red-600">新規断面を作成すると、現行断面において作業途中のファイルはハードリセットされます！
                                データを削除したくない場合はコミットを行って下さい。
                                {/* <br/>参考: <a href="https://git-scm.com/book/ja/v2" target="_blank" rel="noreferrer" className="text-xs underline text-primary">Pro Git</a> */}
                              </p>
                            </DialogDescription>
                          </DialogHeader>

                          <div className="flex-none">
                            <Label htmlFor="branch_name" className="text-xs">ブランチ名</Label>
                            <Input type="text" id="branch_name" placeholder="0.H, 0.H, experimental_20240501 etc..." />
                          </div>
                          <div className="flex-none">
                            <Label htmlFor="zip_file" className="text-xs">zipファイル</Label><br />
                            <Button
                              id="zip_file"
                              onClick={async () => {
                                const selected = await open(
                                  {
                                    directory: false,
                                    multiple: false,
                                    filters: [{ name: 'Zip', extensions: ['zip'] }],
                                    defaultPath: await downloadDir()
                                  }
                                );
                                console.log(selected);
                                // ToDo:reset_hard->ブランチを作成->中身削除->zipファイルを展開->commit

                              }}
                            >Zipファイルを選択する</Button>
                          </div>
                          <DialogFooter>
                            <Button disabled={true}>OK</Button>
                            <Button>Cancel</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>


                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* <p className="text-xs font-semibold text-muted-foreground">ブランチ</p>
                <p className="text-xs text-muted-foreground">{local_version.branchName}</p>
                <p className="text-xs font-semibold text-muted-foreground">最終編集日</p>
                <p className="text-xs text-muted-foreground">{local_version.lastCommitDate}</p> */}
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
    size: 50,
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
