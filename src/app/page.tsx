"use client";

import React from "react";
import Link from "next/link";
import path from "path";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorThemeSelector } from "@/components/theme-seletor";
import { ModsTable } from "@/components/datatable/mod-table/table-mods";
import {
  useAtom,
} from 'jotai'
import {
  modDataDirPath,
  gameModDirPath,
  refreshMods,
  modsQ,
  lastOpenTab as lastOpenTabAtom,
  // mods as modsAtom,
  store as AtomStore,
} from "@/components/atoms";
import { appWindow } from "@tauri-apps/api/window";
import { ask } from '@tauri-apps/api/dialog';
import { ScrollArea } from "@radix-ui/react-scroll-area";

import { LocalPathForm } from "@/components/input-card";
import { popUp } from "@/lib/utils";
import { unzipModArchive } from "@/lib/api";


appWindow.onFileDropEvent(async (ev) => {
  // console.log(ev); // Debug
  if (ev.payload.type !== 'drop') {
    return;
  }
  const does_install = await ask('Add the dropped file to Mod Directory?', 'CDDA Launcher');
  if (!does_install) {
    return;
  }
  const [filepath] = ev.payload.paths;
  const modDataDir = AtomStore.get(modDataDirPath)

  if (path.extname(filepath) === '.zip') {
    unzipModArchive(
      filepath,
      path.join(modDataDir, path.basename(filepath))
    );
    return;
  }
  else if (path.parse(filepath).dir === modDataDir) {
    popUp('success', 'The file is already in the Mod Directory. If you want to update the mod, please create a new version or manually commit your change.');
  }
  else {
    popUp(
      'failed',
      `Handling ${path.extname(filepath) ? path.extname(filepath) : 'directory'} is not supported yet. Please drop .zip file.`
    );
  }
})


export default function Home() {
  const [{ data, isPending, isError }] = useAtom(modsQ);
  const [_, refresh] = useAtom(refreshMods);

  const [lastOpened, setLasetOpened] = useAtom(lastOpenTabAtom);
  // ToDo: 最後に開いたタブの保存がうまくいっていない
  // StorageAtomsの初期化でStorageの値よりdefault値が先に読み込まれている模様
  // console.log(lastOpened); // Debug

  return (
    <main>
      {/* <img src={`/app_icon.webp`} className="w-24 h-24"/> */}
      <div className="w-full overflow-hidden select-none bg-muted/40">
        <div className="w-full h-200 overflow-auto">
        </div>
        <div className="w-full">
          <Tabs defaultValue={lastOpened} className="w-full h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mods" className="text-lg"
                onClick={() => {
                  setLasetOpened('mods');
                  refresh();
                }}
              >
                Mod一覧
              </TabsTrigger>
              <TabsTrigger
                value="setting"
                className="text-lg"
                onClick={() => {
                  setLasetOpened('mods');
                }}
              >設定
              </TabsTrigger>
            </TabsList>
            <TabsContent value="mods">
              <div className="bg-muted/40">
                <ModsTable
                  mods={data!}
                // setMods={setMods}
                />
              </div>
            </TabsContent>
            <TabsContent value="setting">
              <div className="flex min-h-[calc(97vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="mx-auto grid w-full max-w-6xl gap-2">
                  <h1 className="text-3xl font-semibold">設定</h1>
                </div>
                <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
                  <nav
                    className="grid gap-4 text-sm text-muted-foreground" x-chunk="dashboard-04-chunk-0"
                  >
                    <Link href="#mod_management_setting" className="font-semibold text-primary">
                      Mod管理
                    </Link>
                    <Link href="#theme_setting" className="font-semibold text-primary">
                      配色
                    </Link>
                  </nav>
                  <ScrollArea>
                    <div className="grid gap-2" id="mod_management_setting">
                      <p className="font-bold text-xl">Mod管理</p>
                      <LocalPathForm
                        title="Mod保存先"
                        description="Modの集中管理用の任意のディレクトリ"
                        inputAtom={modDataDirPath}
                      />
                      <LocalPathForm
                        title="ゲームのMod読み込み先"
                        description="ゲームがModを読み込むディレクトリ"
                        inputAtom={gameModDirPath}
                      />
                    </div>
                    <br />
                    <div className="grid gap-2" id="theme_setting">
                      <p className="font-bold text-xl">配色</p>
                      <Card>
                        <CardHeader>
                          <CardTitle>配色</CardTitle>
                          <CardDescription>
                            配色を選択します
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ColorThemeSelector />
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="releases">
              <Link
                href="https://github.com/CleverRaven/Cataclysm-DDA/releases"
                className="text-primary"
                target="_blank"
              >
                Cataclysm: Dark Days Ahead Releases
              </Link>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main >
  );
}


