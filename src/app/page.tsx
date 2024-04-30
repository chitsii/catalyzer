"use client";

import React, { useEffect } from "react";
import { useTheme } from 'next-themes';
import Link from "next/link";
import path from "path";
import { toast } from "sonner"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dashboard } from "@/components/setting";
import { theme, ThemeVariants } from "@/components/atoms";

import { ColorThemeSelector } from "@/components/theme-seletor";


import { ModsTable } from "@/components/datatable/mod-table/table-mods";
import { fetchMods } from "@/lib/api";
import {
  PrimitiveAtom,
  useAtom,
  useAtomValue,
} from 'jotai'

import {
  modDataDirPath,
  gameModDirPath,
  gameDir,
  mods as modsAtom,
  store as AtomStore,
  theme as themeAtom,
} from "@/components/atoms";

import { invoke, InvokeArgs } from "@tauri-apps/api/tauri";


// const ThemeChanger = () => {
//   const { theme, setTheme } = useTheme()
//   return (
//     <div>
//       <button onClick={() => setTheme('light')}>Light Mode</button>
//       <button onClick={() => setTheme('dark')}>Dark Mode</button>
//     </div>
//   )
// }

const popUp = (title: "success" | "failed", msg: string) => {
  console.info(msg);
  toast(
    title.toUpperCase(),
    {
      description: msg,
      position: 'top-right',
      duration: 3000,
      closeButton: true,
    }
  );
}

const unzipModArchive = async (src: string, dest: string) => {
  invoke<string>('unzip_mod_archive', { src: src, dest: dest, removeNonModFiles: false })
    .then((response) => {
      popUp('success', 'Mod archive extracted at ' + dest);
    })
    .catch((err) => {
      popUp('failed', err);
    });
}

import { appWindow } from "@tauri-apps/api/window";
import { ask } from '@tauri-apps/api/dialog';
import { ScrollArea } from "@radix-ui/react-scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


type LocalPathFormProps = {
  title: string,
  description?: string,
  inputAtom: PrimitiveAtom<string>,
}
const LocalPathForm = (
  {
    title,
    description,
    inputAtom,
  }: LocalPathFormProps
) => {
  const [value, setValue] = useAtom<string>(inputAtom);
  const [lock, setLock] = React.useState<boolean>(true);

  console.log(value); // Debug

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <Input
              id="source_dir"
              type="text"
              className="p-4 text-xs"
              defaultValue={value as string}
              onChange={(e) => setValue(e.target.value)}
              disabled={lock}
            />
          </form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={() => setLock(!lock)}>{lock ? "変更" : "保存"}</Button>
        </CardFooter>
      </Card>

      {/* <div className="flex grid grid-col-10 gap-x-2">
        <Label htmlFor="source_dir" className="col-span-10 text-xs text-muted-foreground">{title}</Label>
        <Input
          id="source_dir"
          type="text"
          className="p-4 col-span-9 text-xs"
          defaultValue={value as string}
          onChange={(e) => setValue(e.target.value)}
          disabled={lock}
        />
        <Button
          size="sm"
          className="col-span-1 text-xs"
          onClick={() => setLock(!lock)}
        >
          {lock ? "Edit" : "OK"}
        </Button>
      </div> */}
    </>
  );
}

appWindow.onFileDropEvent(async (ev) => {
  console.log(ev);
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
    popUp('success', 'The file is already in the Mod Directory.');
  }
  else {
    popUp(
      'failed',
      `Handling ${path.extname(filepath) ? path.extname(filepath) : 'directory'} is not supported yet. Please drop .zip file.`
    );
  }
})


export default function Home() {
  const { theme, setTheme } = useTheme()

  const [mods, setMods] = useAtom(modsAtom);
  const modDataDir = useAtomValue(modDataDirPath);
  const gameModDir = useAtomValue(gameModDirPath);

  useEffect(() => {
    const modDataDir = AtomStore.get(modDataDirPath);
    const gameModDir = AtomStore.get(gameModDirPath);
    fetchMods(modDataDir, gameModDir, setMods);
  }, []);

  return (
    <main>
      <div className="w-full overflow-hidden select-none bg-muted/40">
        <div className="w-full h-200 overflow-auto">
        </div>
        <div className="w-full">
          <Tabs defaultValue="mods" className="w-full h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mods" className="text-lg"
                onClick={() => { fetchMods(modDataDir, gameModDir, setMods) }}
              >
                Mod一覧
              </TabsTrigger>
              <TabsTrigger value="setting" className="text-lg">設定</TabsTrigger>
            </TabsList>
            <TabsContent value="mods">
              <div className="bg-muted/40">
                <ModsTable
                  mods={mods}
                  setMods={setMods}
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
                    <br/>
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
                          <ColorThemeSelector/>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main >
  );
}


