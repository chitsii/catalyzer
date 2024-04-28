"use client";

import React, { RefObject, useEffect } from "react";
import  Link  from "next/link";
import path  from "path";
import { Greet } from "@/components/greet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { invoke } from '@tauri-apps/api/tauri';
import { LoggingArea, Logger } from "@/components/loggingArea";


export default function Home() {

  const source_ref: RefObject<HTMLInputElement> = React.useRef(null);
  const target_ref: RefObject<HTMLInputElement> = React.useRef(null);
  const subdir_ref: RefObject<HTMLInputElement> = React.useRef(null);

  const [modDirectories, setModDirectories] = React.useState<string[]>([]);
  const [symlinkList, setSymlinkList] = React.useState<string[]>([]);

  const consoleRef: RefObject<HTMLTextAreaElement> = React.useRef(null);
  const logger = new Logger(consoleRef, 'DEBUG');

  const branch_ref: RefObject<HTMLInputElement> = React.useRef(null);


  const listModDirectories = async () => {
    invoke<string[]>('list_mod_directories', { sourceDir: source_ref.current?.value.toString() })
      .then((response) => {
        logger.info(JSON.stringify(response));
        setModDirectories(response);
      })
      .catch((err) => logger.error(err));
  };

  const listSymlinks = async () => {
    const target = target_ref.current?.value;
    if (!target) {
      logger.error('target path is required!');
      return;
    }
    invoke<string[]>('list_symlinks', { targetRootDir: target.toString() })
      .then((response) => {
        logger.info(JSON.stringify(response));
        setSymlinkList(response);
      })
      .catch(logger.error);
  };

  const createSymlink = async () => {
    const source = source_ref.current?.value;
    const target = target_ref.current?.value;
    const subdir = subdir_ref.current?.value;

    if (!source || !target || !subdir) {
      logger.error('source, target and subdir paths are required!');
      return;
    }
    logger.debug([source, target, subdir].join(' '));

    invoke<string>('create_symlink',
    {
      sourceDir: path.join(source, subdir),
      targetDir: path.join(target, subdir)
    }
  )
      .then((response) => {
        logger.debug(response);
        logger.info('symlink created!');
      })
      .catch((err) => logger.error(err))
  };

  const removeSymlink = async () => {
    const target_root = target_ref.current?.value;
    const subdir = subdir_ref.current?.value;

    if (!target_root || !subdir) {
      logger.error('source and target paths are required!');
      return;
    }

    invoke<string>('remove_file', { targetFile: path.join(target_root, subdir)})
      .then((response) => {
        logger.debug(response);
        logger.info('symlink removed!');
      })
      .catch((err) => logger.error(err))
  };

  const createAllSymlinks = async () => {
    listModDirectories();
    const target_root_dir = target_ref.current?.value;
    if (!target_root_dir) {
      logger.error('target path is required!');
      return;
    }
    modDirectories.map((dir) => {
      invoke<string>('create_symlink',
      {
        sourceDir: dir,
        targetDir: path.join(target_root_dir, path.parse(dir).base),
      })
        .then((response) => {
          logger.debug(response);
          logger.info('symlink created!');
        })
        .catch((err) => logger.error(err))
    })
  };

  const removeAllSymlink = async () => {
    symlinkList.map((link) => {
      invoke<string>('remove_file', { targetFile: link })
        .then((response) => {
          logger.debug(response);
          logger.info('symlink removed!');
        })
        .catch((err) => logger.error(err))
    })
  };


  const gitBaseFunc = async (command: string) => {
    const target_root_dir = source_ref.current?.value;
    const subdir = subdir_ref.current?.value;

    if (!target_root_dir || !subdir) {
      logger.error('source and target paths are required!');
      return;
    }

    invoke<string>(command, { targetDir: path.join(target_root_dir, subdir) })
      .then((response) => {
        logger.debug(response);
        logger.info(`executed ${command}' on ${target_root_dir}/${subdir}.`);
      })
      .catch((err) => logger.error(err))
  }

  const initLocalRepo = gitBaseFunc.bind(null, 'init_local_repository');

  const showChanges = gitBaseFunc.bind(null, 'show_changes');
  const commitChanges = gitBaseFunc.bind(null, 'commit_changes');
  const resetChanges = gitBaseFunc.bind(null, 'reset_changes');

  const listBranch = gitBaseFunc.bind(null, 'list_branches');
  const checkoutBranch = gitBaseFunc.bind(null, 'checkout_branch');


  return (
    <main>
      <div>
        <Link href="/test" className="text-cyan-600 hover:underline">Mod List＞＞</Link>
        <div>
          <Label htmlFor="source">Source Dir / Mod Root Dir</Label>
          <Input id="source" type="text" className="p-4" ref={source_ref} defaultValue={"/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source"} />

          <Label htmlFor="target">Target Root Dir</Label>
          <Input id="target" type="text" className="p-4" ref={target_ref} defaultValue={"/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets"} />
          <br /><br />

          <Label htmlFor="subdir">Subdir Name / Mod Dir Name</Label>
          <Input id="subdir" type="text" className="p-4" ref={subdir_ref} defaultValue={"mod1"} />
          <br /><br />

          <p className="font-bold text-xl">Mod追加</p>
          <Button size="sm" className="p-4" onClick={listModDirectories}>List Mod Directories</Button>
          <Button size="sm" className="p-4" onClick={listSymlinks}>List Symlinks</Button>
          <br/>
          <Button size="sm" onClick={createAllSymlinks}>create all symlinks</Button>
          <Button size="sm" className="p-4" onClick={removeAllSymlink}>remove all symlinks</Button>
          <br/>
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

        </div>
        <LoggingArea consoleRef={consoleRef} />
      </div>
    </main>
  );
}

