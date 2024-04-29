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
  getMods,
} from "@/lib/api";
import { Atom, atom, PrimitiveAtom } from 'jotai';
import { useAtom } from 'jotai';
import { useAtomValue, useSetAtom } from 'jotai'


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
  const [mods, setMods] = React.useState<Mod[]>([]);
  // useQuery(() => getMods({ mods, setMods }));

  // ユーザ入力値の参照
  // const source_ref: RefObject<HTMLInputElement> = React.useRef(null);
  // const target_ref: RefObject<HTMLInputElement> = React.useRef(null);
  // const subdir_ref: RefObject<HTMLInputElement> = React.useRef(null);
  const defaultModDataDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source";
  const defaultGameModDir = "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets";

  const modDataPathAtom = atom<string>(defaultModDataDir);
  const gameModDir = atom<string>(defaultGameModDir);

  // コンソールへの出力ログ関連
  const consoleRef: RefObject<HTMLTextAreaElement> = React.useRef(null);
  const logger = new Logger(consoleRef, 'DEBUG');

  // apiから取得するmodd断面情報
  const [modDirectories, setModDirectories] = React.useState<string[]>([]);
  const [symlinkList, setSymlinkList] = React.useState<string[]>([]);
  const branch_ref: RefObject<HTMLInputElement> = React.useRef(null);

  // イベントハンドラ
  // const listModDirectories = fListModDirs(source_ref, logger, setModDirectories);
  // const listSymlinks = fListSymLinks(target_ref, logger, setSymlinkList);
  // const createSymlink = fCreateSymlink(source_ref, target_ref, subdir_ref, logger);
  // const removeSymlink = fRemoveSymlink(target_ref, subdir_ref, logger);
  // const createAllSymlinks = fCreateAllSymlinks(listModDirectories, target_ref, logger, modDirectories);
  // const removeAllSymlinks = fRemoveAllSymlink(symlinkList, logger);

  // const gitCmdBase = fGitCmdBase(source_ref, subdir_ref, logger)
  // const initLocalRepo = gitCmdBase.bind(null, 'init_local_repository');
  // const showChanges = gitCmdBase.bind(null, 'show_changes');
  // const commitChanges = gitCmdBase.bind(null, 'commit_changes');
  // const resetChanges = gitCmdBase.bind(null, 'reset_changes');
  // const listBranch = gitCmdBase.bind(null, 'list_branches');
  // const checkoutBranch = gitCmdBase.bind(null, 'checkout_branch');


  return (
    <main>
      <div className="w-full overflow-hidden select-none">
        <div className="w-full h-200 overflow-auto">
          <LocalPathForm
            title="Modデータディレクトリ"
            inputAtom={modDataPathAtom}
          />
          <LocalPathForm
            title="Targetディレクトリ"
            inputAtom={gameModDir}
          />
          {/* <LocalPathForm
            title="Modディレクトリ"
            validateHandler={() => { }}
            defaultValue={"mod1"}
          /> */}
        </div>
        <div className="w-full">
          <Tabs defaultValue="wip" className="w-full">
            <TabsList>
              <TabsTrigger value="wip" className="w-[250px]">WIP</TabsTrigger>
              <TabsTrigger value="mods" className="w-[250px]" onClick={() => getMods({ mods, setMods })}>Mods</TabsTrigger>
              <TabsTrigger value="console" className="w-[250px]">ログ</TabsTrigger>
            </TabsList>
            <TabsContent value="wip">
              <br /><br />
              <p className="font-bold text-xl">Mod追加</p>
              {/* <Button size="sm" className="p-4" onClick={listModDirectories}>List Mod Directories</Button> */}
              {/* <Button size="sm" className="p-4" onClick={listSymlinks}>List Symlinks</Button> */}
              <br />
              {/* <Button size="sm" onClick={createAllSymlinks}>create all symlinks</Button>
              <Button size="sm" className="p-4" onClick={removeAllSymlinks}>remove all symlinks</Button>
              <br />
              <Button size="sm" className="p-4" onClick={createSymlink}>create 1 symlink</Button>
              <Button size="sm" className="p-4" onClick={removeSymlink}>remove 1 symlink</Button> */}


              <p className="font-bold text-xl">断面管理</p>
              {/* <Button onClick={initLocalRepo}>Gitリポジトリ初期化</Button>
              <Button onClick={showChanges}>作業差分取得</Button>
              <Button onClick={commitChanges}>作業差分記録</Button>
              <Button onClick={resetChanges}>作業差分リセット</Button>
              <br />
              <Input id="branch" type="text" className="p-4" ref={branch_ref} defaultValue={"main"} />
              <Button onClick={listBranch}>ブランチ一覧取得</Button>
              <Button onClick={checkoutBranch}>ブランチ切り替え</Button> */}
            </TabsContent>
            <TabsContent value="mods">
              <Button className="text-xs" onClick={() => getMods({ mods, setMods })}>Scan</Button>
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


