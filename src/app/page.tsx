"use client";

import React, { RefObject, useEffect } from "react";
import Link from "next/link";
import path from "path";
import { Greet } from "@/components/greet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { invoke } from '@tauri-apps/api/tauri';
import { LogConsole, Logger } from "@/components/log-console";
import { ModsTable, Mod } from "@/components/datatable/mod-table/table-mods";
import {
  fListModDirs,
  fListSymLinks,
  fCreateSymlink,
  fRemoveSymlink,
  fCreateAllSymlinks,
  fRemoveAllSymlink,
  GitCmdBase,
  // fetchMods,
} from "@/lib/api";
import { Atom, atom, PrimitiveAtom } from 'jotai';
import { useAtom } from 'jotai';
import { useAtomValue, useSetAtom } from 'jotai'

import {
  modDataDirPath,
  gameModDirPath,
  gameDir,
  mods as modsAtom,
} from "@/components/atoms";


export type LocalPathFormProps = {
  title: string,
  inputAtom: PrimitiveAtom<string>,
}
const LocalPathForm = (
  {
    title,
    inputAtom,
  }: LocalPathFormProps
) => {
  const [value, setValue] = useAtom<string>(inputAtom);
  const [lock, setLock] = React.useState<boolean>(true);

  console.log(value); // Debug

  return (
    <>
      <div className="flex grid grid-col-10 gap-x-2">
        <Label htmlFor="source_dir" className="col-span-10 text-xs text-gray-600">{title}</Label>
        <Input
          id="source_dir"
          type="text"
          className="p-4 col-span-9 text-xs text-gray-100 bg-gray-900"
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
      </div>
    </>
  );
}

export default function Home() {
  const [mods, setMods] = useAtom(modsAtom);
  const modDataDir = useAtomValue(modDataDirPath);

  const refrshMods = async () => {
    const res = await invoke<Mod[]>("scan_mods", { sourceDir: modDataDir }).then(
      (mods) => {
        console.log(mods);
        setMods(mods);
      }
    ).catch(
      (err) => {
        console.error(err);
      }
    );
  }

  // コンソールへの出力ログ関連
  const consoleRef: RefObject<HTMLTextAreaElement> = React.useRef(null);

  return (
    <main>
      <div className="w-full overflow-hidden select-none">
        <div className="w-full h-200 overflow-auto">
          asdf
        </div>
        <div className="w-full">
          <Tabs defaultValue="wip" className="w-full">
            <TabsList className="">
              <TabsTrigger value="mods" className="w-auto"
                onClick={refrshMods}>Mods</TabsTrigger>
              <TabsTrigger value="wip" className="w-auto">Settings</TabsTrigger>
              <TabsTrigger value="console" className="w-auto">ログ</TabsTrigger>
            </TabsList>
            <TabsContent value="wip" className="p-2 space-y-4">
              <div>
                <p className="font-bold text-xl">Mod管理</p>
                <LocalPathForm
                  title="Modデータディレクトリ"
                  inputAtom={modDataDirPath}
                />
                <LocalPathForm
                  title="Targetディレクトリ"
                  inputAtom={gameModDirPath}
                />
              </div>
              <div>
                <p className="font-bold text-xl">ゲーム</p>
                <LocalPathForm
                  title="ゲーム本体へのディレクトリパス"
                  inputAtom={gameDir}
                />
              </div>
            </TabsContent>
            <TabsContent value="mods">
              {/* <Button className="text-xs" onClick={}>Scan</Button> */}
              {/* <Button onClick={createAllSymlinks}>全てゲームに追加</Button>
              <Button onClick={removeAllSymlinks}>全てゲームから削除</Button> */}
              <ModsTable
                mods={mods}
                setMods={setMods}
              />
            </TabsContent>
            <TabsContent value="console">
              <LogConsole
                consoleRef={consoleRef}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main >
  );
}


