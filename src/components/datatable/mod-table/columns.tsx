"use client";

import React from "react";
import { info, error, debug } from "tauri-plugin-log-api";
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
  Drawer,
  // DrawerClose,
  DrawerContent,
  // DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isNonEmptyStringOrArray, popUp } from "@/lib/utils";
import {
  installMod,
  uninstallMod,
  gitCommand,
  openLocalDir,
  listBranches,
  unzipModArchive,
  fetchMods,
} from "@/lib/api";
import { open, ask } from "@tauri-apps/plugin-dialog";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    fetchMods: typeof fetchMods;
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
    size: 160,
    minSize: 160,
    cell: ({ row }) => {
      const info: ModInfo = row.getValue("info");
      if (info == null) return null;
      return (
        <div>
          {info.name && (
            <div>
              <p
                className="text-sm text-primary cursor-pointer hover:underline"
                onClick={() => {
                  openLocalDir(row.original.localPath);
                }}
              >
                {info.name}
              </p>
            </div>
          )}
          {isNonEmptyStringOrArray(info.authors) && (
            <p className="text-xs text-muted-foreground">
              作成者 {Array.isArray(info.authors) ? info.authors.map((author) => author).join(",") : info.authors}
            </p>
          )}
          {isNonEmptyStringOrArray(info.maintainers) && (
            <p className="text-xs text-muted-foreground">メンテナ {info.maintainers}</p>
          )}
          {info.category && <Badge variant="category">{info.category}</Badge>}
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
    size: 175,
    minSize: 175,
    // enableResizing: false,
    cell: ({ row }) => {
      const info: ModInfo = row.getValue("info");
      if (info == null) return null;
      return (
        <>
          {info.description && (
            <div>
              <p className="text-xs text-muted-foreground">{info.description}</p>
            </div>
          )}
          <div className="pt-1 pl-4 text-[11px] text-muted-foreground leading-tight">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="notInstalled" size="sm" className="ml-2 text-[10px]" onMouseEnter={fetchBranches}>
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
                          // popUp("info", "未選択です");
                          return;
                        } else if (selectedBranchName == local_version.branchName) {
                          // popUp("info", "既に選択されているバージョンです");
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
                      e.preventDefault();
                    }}
                  >
                    <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DrawerTrigger>
                        <div className="flex gap-1">
                          <GitGraphIcon size={16} />
                          {/* 新規断面を作成 */}
                          {table.options.meta?.t("mod_create_new_branch")}
                        </div>
                      </DrawerTrigger>
                      <DrawerContent
                        onInteractOutside={(e) => {
                          e.preventDefault();
                        }}
                      >
                        <DrawerHeader>
                          <DrawerTitle>
                            {table.options.meta?.t("mod_create_new_branch")}: {row.original.info.name}
                          </DrawerTitle>
                        </DrawerHeader>
                        <div className="flex place-content-center">
                          <form>
                            <div className="flex-none">
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
                                placeholder="0.G, experimental, 20240606 etc..."
                                className="w-[450px]"
                                onChange={async (e) => {
                                  setNewBranchName(e.target.value);
                                }}
                              />
                              <p className="text-sm">
                                {"> "}
                                {newBranchName}
                              </p>
                            </div>
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
                                    setUploadFilePath(
                                      selected.path, // .replace(/\\/g, "/")
                                    );
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
                              onClick={async (e: any) => {
                                let yes = await ask("新規断面を作成しますか？");
                                if (!yes) return;

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
                        <DrawerFooter></DrawerFooter>
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
                  <Button variant="notInstalled" size="sm" className="ml-2 text-[10px]">
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
      return (
        <>
          <Toggle
            aria-label="toggle_install"
            variant="outline"
            data-state={isInstalled ? "installed" : "notInstalled"}
            onPressedChange={(e) => {
              const mod_data_dir = row.original.localPath;
              if (isInstalled) {
                uninstallMod(mod_data_dir);
              } else {
                installMod(mod_data_dir);
              }
              // reload table
              const f = table.options.meta?.fetchMods;
              if (f) f();
            }}
          >
            <FolderSymlink
              strokeWidth={3}
              size={22}
              color={isInstalled ? "green" : "gray"}
              className="cursor-pointer"
            />
          </Toggle>
        </>
      );
    },
  },
];
