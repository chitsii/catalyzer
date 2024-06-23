"use client";

import React from "react";
import { useState } from "react";
import { info, error, debug } from "@tauri-apps/plugin-log";
import { ColumnDef, RowData } from "@tanstack/react-table";
import { GitGraphIcon, FolderSymlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import path from "path";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
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
import { isNonEmptyStringOrArray, popUp } from "@/lib/utils";
import {
  installMod,
  uninstallMods,
  gitCommand,
  openLocalDir,
  listBranches,
  unzipModArchive,
  listMods,
} from "@/lib/api";
import { open, ask } from "@tauri-apps/plugin-dialog";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    fetchMods: typeof listMods;
    t: (key: string) => string; // i18n
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
  obsolete?: boolean;
};

type LocalVersion = {
  branchName: string;
  lastCommitDate: string | null;
};

export type Mod = {
  info: ModInfo;
  localVersion: LocalVersion | null;
  isInstalled: boolean;
  localPath: string;
};

export const columns: ColumnDef<Mod>[] = [
  {
    accessorKey: "rowIndex",
    header: "#",
    size: 5,
    enableResizing: false,
    cell: ({ row }) => {
      return <p className="text-xs">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "name",
    header: ({ table }) => {
      return table.options.meta?.t("mod_name");
    },
    // enableResizing: false,
    size: 135,
    minSize: 135,
    cell: ({ row }) => {
      const info: ModInfo = row.getValue("info");
      if (info == null) return null;
      return (
        <div className="leading-tight">
          {info.name && (
            <div>
              <p
                className="text-xs text-primary break-all cursor-pointer leading-tight hover:underline"
                onClick={() => {
                  openLocalDir(row.original.localPath);
                }}
              >
                {
                  // Remove color tags
                  info.name.replace(/<color_[a-z_]+>|<\/color>/g, "")
                }
              </p>
            </div>
          )}
          {isNonEmptyStringOrArray(info.authors) && (
            <p className="text-[10px] text-muted-foreground">
              作成 {Array.isArray(info.authors) ? info.authors.map((author) => author).join(",") : info.authors}
            </p>
          )}
          {isNonEmptyStringOrArray(info.maintainers) && (
            <p className="text-[10px] text-muted-foreground">保守 {info.maintainers}</p>
          )}
          {/* {info.category && <Badge variant="category">{info.category}</Badge>} */}
        </div>
      );
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
        row.original.info.dependencies,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      let searchTerms = Array.isArray(filterValues) ? filterValues : [filterValues];
      return searchTerms.some((term) => userInfoString.includes(term.toLowerCase()));
    },
  },
  {
    accessorKey: "info",
    header: ({ table }) => {
      return table.options.meta?.t("mod_description");
    },
    size: 200,
    minSize: 200,
    // enableResizing: false,
    cell: ({ row }) => {
      const info: ModInfo = row.getValue("info");
      if (info == null) return null;
      return (
        <>
          {info.description && (
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">{info.description}</p>
            </div>
          )}
          <div className="pt-1 pl-4 text-[9px] text-muted-foreground leading-tight">
            {Object.keys(info).map((k) => {
              const value = info[k as keyof ModInfo];
              // 前のカラムで表示済み
              const skipKeys = ["type", "ident", "id", "name", "authors", "maintainers", "category", "description"];
              if (skipKeys.includes(k)) return null;
              if (Array.isArray(value)) {
                return (
                  value.join("").trim() != "" && (
                    <p key={k}>
                      <span className="font-semibold uppercase">{k}: </span>
                      <span>{value.join(", ")}</span>
                    </p>
                  )
                );
              } else {
                return (
                  value && (
                    <p key={k}>
                      <span className="font-semibold uppercase">{k}: </span>
                      <span>{JSON.stringify(value)}</span>
                    </p>
                  )
                );
              }
            })}
          </div>
        </>
      );
    },
  },
  {
    accessorKey: "localVersion",
    header: ({ table }) => {
      return table.options.meta?.t("mod_version");
    },
    size: 50,
    minSize: 50,
    // enableResizing: false,
    cell: ({ row, table }) => {
      const local_version: LocalVersion = row.getValue("localVersion");

      const [branches, setBranches] = React.useState<string[]>(["foo", "bar"]);
      const [dialogOpen, setDialogOpen] = React.useState(false);
      const [dropdownOpen, setDropdownOpen] = React.useState(false);
      const [uploadFilePath, setUploadFilePath] = React.useState<string>("");
      const [newBranchName, setNewBranchName] = React.useState<string>("");

      const fetchBranches = async () => {
        const branches = await listBranches(row.original.localPath);
        const barnchesWithoutCurrent = branches.filter((branch) => branch != local_version.branchName);
        setBranches(barnchesWithoutCurrent);
      };

      return (
        <div>
          {local_version ? (
            <>
              <DropdownMenu
                onOpenChange={(isOpen) => {
                  if (isOpen) {
                    fetchBranches();
                  }
                  setDropdownOpen(isOpen);
                }}
                open={dropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="notInstalled"
                    className="w-16 h-10 p-0 ml-2 text-[10px] break-all line-clamp-2 whitespace-normal"
                    onMouseEnter={fetchBranches}
                  >
                    {local_version.branchName}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>
                    <form
                      onSubmit={(e: any) => {
                        e.preventDefault();
                        const selectedBranchName: string = e.target["selectedVersionSwitchTo"].value;
                        // 現在と同じブランチには切り替えない
                        if (selectedBranchName == "") {
                          return;
                        } else if (selectedBranchName == local_version.branchName) {
                          return;
                        }
                        gitCommand("git_checkout", {
                          targetDir: row.original.localPath,
                          targetBranch: selectedBranchName,
                          createIfUnexist: false,
                        });
                        table.options.meta?.fetchMods(); // reload table
                      }}
                    >
                      <p>
                        {/* バージョン変更 */}
                        {table.options.meta?.t("mod_versin_switch")}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 min-w-[120px]">
                          <Select name="selectedVersionSwitchTo">
                            <SelectTrigger>
                              <SelectValue
                                placeholder={// 切替先...
                                table.options.meta?.t("mod_switch_to")}
                                defaultValue={""}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.length > 0 ? (
                                branches.map((branch) => (
                                  <SelectItem key={branch} value={branch}>
                                    {branch}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="dummy" disabled={true}>
                                  {/* 切替可能な断面がありません */}
                                  {table.options.meta?.t("mod_there_is_no_switchable_branch")}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="col-span-1">
                          OK
                        </Button>
                      </div>
                    </form>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      setDropdownOpen(false);
                      setDialogOpen(true);
                    }}
                  ></DropdownMenuItem>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger>
                      <div className="flex gap-1">
                        <GitGraphIcon size={16} />
                        {/* 新規断面を作成 */}
                        {table.options.meta?.t("mod_create_new_branch")}
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {table.options.meta?.t("mod_create_new_branch")}: {row.original.info.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="flex place-content-center">
                        <form className="flex-none">
                          <Label htmlFor="newBranchName" className="text-xs">
                            {/* ブランチ名 */}
                            {table.options.meta?.t("mod_branch_name")}
                          </Label>
                          <Input
                            key="newBranchName"
                            type="text"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            name="newBranchName"
                            id="newBranchName"
                            placeholder="0.H, yyyymm etc..."
                            className="w-[450px]"
                            onChange={(e) => {
                              setNewBranchName(e.target.value);
                            }}
                          />
                          <p className="text-xs">
                            {"> "}
                            {newBranchName}
                          </p>
                          <div className="flex-none">
                            <Label htmlFor="zip_file" className="text-xs">
                              {/* zipファイル */}
                              {table.options.meta?.t("zip_file")}
                            </Label>
                            <p className="text-xs">
                              {uploadFilePath
                                ? path.parse(uploadFilePath).base
                                : // "ファイルが選択されていません"
                                  table.options.meta?.t("file_not_selected")}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                const pathModule = await import("@tauri-apps/api/path");
                                const { downloadDir } = pathModule;

                                const selected = await open({
                                  directory: false,
                                  multiple: false,
                                  filters: [{ name: "Zip", extensions: ["zip"] }],
                                  defaultPath: await downloadDir(),
                                });
                                if (selected == null || Array.isArray(selected)) {
                                  return;
                                } else {
                                  setUploadFilePath(selected.path);
                                }
                              }}
                            >
                              {/* ファイルを選択... */}
                              {table.options.meta?.t("select_zip_file")}
                            </Button>
                          </div>
                          <br />
                          <Button
                            size="sm"
                            onClick={(e: any) => {
                              //作業中のデータ削除
                              gitCommand("git_reset_changes", {
                                targetDir: row.original.localPath,
                              });

                              // ブランチを作成, 既存ファイルを削除
                              const input_branch_name = newBranchName;

                              if (input_branch_name == null) {
                                popUp("failed", "ブランチ名が入力されていません！");
                                return;
                              }
                              gitCommand("git_checkout", {
                                targetDir: row.original.localPath,
                                targetBranch: input_branch_name,
                                createIfUnexist: true,
                              });
                              debug("checkout done.");

                              // zipファイルを展開
                              if (!!uploadFilePath) {
                                unzipModArchive(uploadFilePath, true);
                                debug("unzip done.");

                                // commit changes
                                gitCommand("git_commit_changes", {
                                  targetDir: row.original.localPath,
                                });
                              }

                              gitCommand("git_reset_changes", {
                                targetDir: row.original.localPath,
                              });

                              // reload table
                              table.options.meta?.fetchMods();
                              // close dialog
                              setDialogOpen(false);
                            }}
                          >
                            OK
                          </Button>
                        </form>
                      </div>
                      <DialogFooter></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="notInstalled"
                    className="w-16 h-10 p-0 ml-2 text-[10px] break-all line-clamp-2 whitespace-normal"
                  >
                    N/A
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      info(`start managing section: ${JSON.stringify(row.original.localPath)}`);
                      const localPath = row.original.localPath;
                      gitCommand("git_init", { targetDir: localPath });

                      // reload table
                      const f = table.options.meta?.fetchMods;
                      if (f) f();
                    }}
                  >
                    <div className="flex gap-1">
                      <GitGraphIcon size={16} />
                      {/* 断面管理を始める */}
                      {table.options.meta?.t("mod_start_versioning")}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "isInstalled",
    header: ({ table }) => {
      return table.options.meta?.t("mod_state");
    },
    // size: 50,
    // minSize: 50,
    // enableResizing: false,
    cell: ({ row, table }) => {
      const isInstalled: boolean = row.getValue("isInstalled");
      const [installed, setInstalled] = useState(isInstalled);
      return (
        <>
          <Toggle
            aria-label="toggle_install"
            variant="outline"
            onPressedChange={(e) => {
              const mod_data_dir = row.original.localPath;
              if (installed) {
                uninstallMods(mod_data_dir);
              } else {
                installMod(mod_data_dir);
              }
              setInstalled(!installed);
            }}
          >
            <FolderSymlink
              strokeWidth={3}
              size={22}
              className={
                installed
                  ? "text-emerald-300 cursor-pointer transition-colors duration-400 ease-in-out"
                  : "text-gray-600 cursor-pointer transition-colors duration-400 ease-in-out"
              }
            />
          </Toggle>
        </>
      );
    },
  },
];
