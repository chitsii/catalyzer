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

import { invoke } from '@tauri-apps/api/tauri';
import { LoggingArea, Logger } from "@/components/loggingArea";
import { ModsTable } from "@/components/datatable/table-mods/table-mods";
import {
  fListModDirs,
  fListSymLinks,
  fCreateSymlink,
  fRemoveSymlink,
  fCreateAllSymlinks,
  fRemoveAllSymlink,
  fGitCmdBase
} from "@/lib/api";



export default function Home() {

  // ユーザ入力値の参照
  const source_ref: RefObject<HTMLInputElement> = React.useRef(null);
  const target_ref: RefObject<HTMLInputElement> = React.useRef(null);
  const subdir_ref: RefObject<HTMLInputElement> = React.useRef(null);

  // コンソールへの出力ログ関連
  const consoleRef: RefObject<HTMLTextAreaElement> = React.useRef(null);
  const logger = new Logger(consoleRef, 'DEBUG');

  // apiから取得するmodd断面情報
  const [modDirectories, setModDirectories] = React.useState<string[]>([]);
  const [symlinkList, setSymlinkList] = React.useState<string[]>([]);
  const branch_ref: RefObject<HTMLInputElement> = React.useRef(null);

  // イベントハンドラ
  const listModDirectories = fListModDirs(source_ref, logger, setModDirectories);
  const listSymlinks = fListSymLinks(target_ref, logger, setSymlinkList);
  const createSymlink = fCreateSymlink(source_ref, target_ref, subdir_ref, logger);
  const removeSymlink = fRemoveSymlink(target_ref, subdir_ref, logger);
  const createAllSymlinks = fCreateAllSymlinks(listModDirectories, target_ref, logger, modDirectories);
  const removeAllSymlink = fRemoveAllSymlink(symlinkList, logger);

  const gitCmdBase = fGitCmdBase(source_ref, subdir_ref, logger)
  const initLocalRepo = gitCmdBase.bind(null, 'init_local_repository');
  const showChanges = gitCmdBase.bind(null, 'show_changes');
  const commitChanges = gitCmdBase.bind(null, 'commit_changes');
  const resetChanges = gitCmdBase.bind(null, 'reset_changes');
  const listBranch = gitCmdBase.bind(null, 'list_branches');
  const checkoutBranch = gitCmdBase.bind(null, 'checkout_branch');

  return (
    <main>
      <div>
        {/* <Link href="/test" className="text-cyan-600 hover:underline">Mod List＞＞</Link> */}
        <div>
          <Accordion type="single" defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger>機能</AccordionTrigger>
              <AccordionContent>
                <div>
                  <Label htmlFor="source_dir">Modデータディレクトリ</Label>
                  <Input id="source_dir" type="text" className="p-4" ref={source_ref} defaultValue={"/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source"} />
                  <Button onClick={() => { }}>OK</Button>
                </div>

                <Label htmlFor="target">Target Root Dir</Label>
                <Input id="target" type="text" className="p-4" ref={target_ref} defaultValue={"/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets"} />
                <br /><br />

                <Label htmlFor="subdir">Subdir Name / Mod Dir Name</Label>
                <Input id="subdir" type="text" className="p-4" ref={subdir_ref} defaultValue={"mod1"} />
                <br /><br />

                <p className="font-bold text-xl">Mod追加</p>
                <Button size="sm" className="p-4" onClick={listModDirectories}>List Mod Directories</Button>
                <Button size="sm" className="p-4" onClick={listSymlinks}>List Symlinks</Button>
                <br />
                <Button size="sm" onClick={createAllSymlinks}>create all symlinks</Button>
                <Button size="sm" className="p-4" onClick={removeAllSymlink}>remove all symlinks</Button>
                <br />
                <Button size="sm" className="p-4" onClick={createSymlink}>create 1 symlink</Button>
                <Button size="sm" className="p-4" onClick={removeSymlink}>remove 1 symlink</Button>


                <p className="font-bold text-xl">断面管理</p>
                <Button onClick={initLocalRepo}>Gitリポジトリ初期化</Button>
                <Button onClick={showChanges}>作業差分取得</Button>
                <Button onClick={commitChanges}>作業差分記録</Button>
                <Button onClick={resetChanges}>作業差分リセット</Button>
                <br />
                <Input id="branch" type="text" className="p-4" ref={branch_ref} defaultValue={"main"} />
                <Button onClick={listBranch}>ブランチ一覧取得</Button>
                <Button onClick={checkoutBranch}>ブランチ切り替え</Button>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="mod-table">
              <AccordionTrigger>Mods</AccordionTrigger>
              <AccordionContent>
                <ModsTable />
              </AccordionContent>
            </AccordionItem>
            <LoggingArea consoleRef={consoleRef} />
          </Accordion>
        </div>
        <div>

        </div>

      </div>
    </main>
  );
}
