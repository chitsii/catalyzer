"use client";

import React from "react";
import { ColumnDef, RowData } from "@tanstack/react-table";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isNonEmptyStringOrArray, popUp } from "@/lib/utils";
import {
  createSymlink,
  removeSymlink,
  GitCmd,
  openLocalDir,
  list_branches,
  unzipModArchive
} from "@/lib/api";
import { open, ask } from '@tauri-apps/api/dialog';

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
                  className="text-sm text-primary cursor-pointer hover:underline"
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
              <p className="text-xs text-muted-foreground">作成者 {
                Array.isArray(info.authors)
                  ? info.authors.map((author) => author).join(",")
                  : info.authors
              }</p>
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
    header: "Version",
    size: 50,
    cell: ({ row, table }) => {
      const local_version: LocalVersion = row.getValue("localVersion");

      const [branches, setBranches] = React.useState<string[]>(["foo", "bar"]);
      const [dialogOpen, setDialogOpen] = React.useState(false);
      const [uploadFilePath, setUploadFilePath] = React.useState<string>("");
      const [newBranchName, setNewBranchName] = React.useState<string>("");

      const fetchBranches = async () => {
        const branches = await list_branches(row.original.localPath);
        console.log(branches);
        const barnchesWithoutCurrent = branches.filter((branch) => branch != local_version.branchName);
        setBranches(barnchesWithoutCurrent);
      }

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
                      onMouseEnter={fetchBranches}
                    >
                      {local_version.branchName}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>
                      <form onSubmit={(e: any) => {
                        e.preventDefault();
                        const selectedBranchName: string = e.target["selectedVersionSwitchTo"].value;
                        console.log(selectedBranchName);
                        GitCmd("git_checkout", {
                          targetDir: row.original.localPath,
                          targetBranch: selectedBranchName,
                          createIfUnexist: false,
                        });
                        table.options.meta?.fetchMods(); // reload table
                      }}>
                        <p>バージョン変更</p>
                        <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 min-w-[120px]">
                          <Select name="selectedVersionSwitchTo">
                            <SelectTrigger>
                              <SelectValue placeholder="切り替え先..." />
                            </SelectTrigger>
                            <SelectContent>
                              {
                                branches.length > 0
                                  ? branches.map((branch) => (
                                    <SelectItem key={branch} value={branch}>
                                      {branch}
                                    </SelectItem>
                                  ))
                                  : <SelectItem value="dummy" disabled={true}>切替可能な断面がありません</SelectItem>
                              }
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="col-span-1">OK</Button>
                        </div>
                      </form>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.preventDefault(); }}>
                      <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DrawerTrigger>
                          <div className="flex gap-1"><GitGraphIcon size={16} />新規断面を作成</div>
                        </DrawerTrigger>
                        <DrawerContent onInteractOutside={(e) => { e.preventDefault(); }}>
                          <DrawerHeader>
                            <DrawerTitle>新規断面作成: {row.original.info.name}</DrawerTitle>
                            <DrawerDescription>
                              新規のブランチ名とModのzipファイルを選択してください。
                              <span className="text-xs text-red-600">
                                新規断面を作成すると、現行断面において作業途中のファイルはハードリセットされます！
                                データを削除したくない場合はコミットを行って下さい。
                                <br />
                              </span>
                            </DrawerDescription>
                          </DrawerHeader>
                          <div className="flex place-content-center">
                          <form>
                            <div className="flex-none">
                              <Label htmlFor="newBranchName" className="text-xs">ブランチ名</Label>
                              <Input
                                type="text"
                                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                                name="newBranchName" id="newBranchName" placeholder="0.G, experimental_20240501 etc..."
                                className="w-[450px]"
                                onChange={async (e) => {
                                    setNewBranchName(e.target.value);
                                }}
                              />
                              <p className="text-sm">{"> "}{newBranchName}</p>
                            </div>
                            <div className="flex-none">
                              <Label htmlFor="zip_file" className="text-xs">zipファイル</Label><br />
                              <Button type="button"
                                onClick={async () => {
                                  const pathModule = await import('@tauri-apps/api/path');
                                  const { downloadDir } = pathModule;

                                  const selected = await open(
                                    {
                                      directory: false,
                                      multiple: false,
                                      filters: [{ name: 'Zip', extensions: ['zip'] }],
                                      defaultPath: await downloadDir()
                                    }
                                  );
                                  if (selected == null || Array.isArray(selected)) {
                                    return
                                  } else {
                                    setUploadFilePath(selected);
                                  }
                                }}
                              >ファイルを選択...</Button>
                              <p>{uploadFilePath
                                ? path.parse(uploadFilePath).base
                                : "ファイルが選択されていません"}</p>
                            </div>
                            <Button onClick={
                              async (e: any) => {
                                let yes = await ask("create new branch and unzip mod archive?");
                                if (!yes) return;

                                //作業中のデータ削除
                                GitCmd("git_reset_changes", { targetDir: row.original.localPath });

                                // ブランチを作成, 既存ファイルを削除
                                const input_branch_name = newBranchName;

                                if (input_branch_name == null) {
                                  popUp("failed", "ブランチ名が入力されていません！");
                                  return
                                }
                                GitCmd("git_checkout", {
                                  targetDir: row.original.localPath,
                                  targetBranch: input_branch_name,
                                  createIfUnexist: true,
                                });
                                console.debug("checkout done");

                                // zipファイルを展開
                                unzipModArchive(
                                  uploadFilePath,
                                  row.original.localPath,
                                  true
                                );
                                console.debug("unzip done");

                                // commit changes
                                GitCmd("git_commit_changes", { targetDir: row.original.localPath });
                                GitCmd("git_reset_changes", { targetDir: row.original.localPath });
                              }
                            }>
                              OK
                            </Button>
                          </form>
                          </div>
                          <DrawerFooter>
                            <DrawerClose>Cancel</DrawerClose>
                          </DrawerFooter>
                        </DrawerContent>
                      </Drawer>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => {
                        console.log(`start managing section: ${JSON.stringify(row.original.localPath)}`)
                        const localPath = row.original.localPath;
                        GitCmd("git_init", { targetDir: localPath });

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
                className="text-xs"
                variant={isInstalled ? "installed" : "notInstalled"}
              >
                {isInstalled ? "Installed" : "Not Installed"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={
                () => {
                  const targetDir = table.options.meta?.gameModDir;
                  const base = path.parse(row.original.localPath).base;

                  if (!targetDir || targetDir == "") {
                    console.error("target directory is not set!");
                    popUp("failed", "target directory is not set!");
                    return
                  };
                  const targetModDir = path.join(targetDir, base);

                  if (isInstalled) {
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
]
