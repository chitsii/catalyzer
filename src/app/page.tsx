"use client";

import React, { RefObject, useEffect } from "react";
import Link from "next/link";
import path from "path";
import { toast } from "sonner"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { CircleUser, Menu, Package2, Search } from "lucide-react"
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


// import { LogConsole, Logger } from "@/components/log-console";
import { ModsTable, Mod } from "@/components/datatable/mod-table/table-mods";
import {
  fetchMods,
} from "@/lib/api";
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
  store as AtomStore
} from "@/components/atoms";
import { invoke, InvokeArgs } from "@tauri-apps/api/tauri";
import { cn } from "@/lib/utils";


const popUp = (title: "success" | "failed", msg: string) => {
  console.info(msg);
  toast(
    title.toUpperCase(),
    {
      description: msg,
      duration: 100,
      // className: cn("fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:right-0 sm:flex-col md:max-w-[420px] data-[state=open]:sm:slide-in-from-bottom-full to data-[state=open]:sm:slide-in-from-top-full")
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
            {/* <Input placeholder="Store Name" /> */}
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
    // toast('The file is already in the Mod Directory.');
    // console.error('The file is already in the Mod Directory.');
  }
  else {
    popUp(
      'failed',
      `Handling ${path.extname(filepath) ? path.extname(filepath) : 'directory'} is not supported yet. Please drop .zip file.`
    );
  }
})

export default function Home() {
  const [mods, setMods] = useAtom(modsAtom);
  const modDataDir = useAtomValue(modDataDirPath);
  const gameModDir = useAtomValue(gameModDirPath);

  // コンソールへの出力ログ関連
  const consoleRef: RefObject<HTMLTextAreaElement> = React.useRef(null);

  return (
    <main>
      <div className="w-full overflow-hidden select-none bg-muted/40">
        <div className="w-full h-200 overflow-auto">
        </div>
        <div className="w-full">
          <Tabs defaultValue="wip" className="w-full h-full">
            <TabsList className="m-5">
              <TabsTrigger value="mods" className="text-lg"
                onClick={() => { fetchMods(modDataDir, gameModDir, setMods) }}
              >
                Mod一覧
              </TabsTrigger>
              <TabsTrigger value="wip" className="text-lg">設定</TabsTrigger>
              {/* <TabsTrigger value="console" className="text-lg">ログ</TabsTrigger> */}
            </TabsList>
            <TabsContent value="wip">
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
                    {/* <Link href="#">Security</Link>
                    <Link href="#">Integrations</Link>
                    <Link href="#">Support</Link>
                    <Link href="#">Organizations</Link>
                    <Link href="#">Advanced</Link> */}
                  </nav>
                  <div className="grid gap-6">
                    <p id="mod_management_setting" className="font-bold text-xl">Mod管理</p>
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
                    <div>
                      {/* <LocalPathForm
                      title="ゲーム本体へのディレクトリパス"
                      description="ゲームを起動するために必要"
                      inputAtom={gameDir}
                    /> */}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="mods">
              <div className="bg-muted/40">
                <ModsTable
                  mods={mods}
                  setMods={setMods}
                />
              </div>
            </TabsContent>
            <TabsContent value="console">
              {/* <LogConsole
                consoleRef={consoleRef}
              /> */}
              <Dashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main >
  );
}


