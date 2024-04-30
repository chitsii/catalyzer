import { Mod } from "@/components/datatable/mod-table/columns";
import { Logger } from "@/components/log-console";
import { invoke, InvokeArgs } from "@tauri-apps/api/tauri";
import path from "path";
import React from "react";

export function GitCmdBase(targetDir: string) {
  return async (command: string) => {
    if (!targetDir) return;
    invoke<string>(command, { targetDir: targetDir })
      .then((response) => {
        console.debug(response);
        console.info(`executed ${command}' on ${targetDir}.`);
      })
      .catch((err) => console.error(err));
  };
};

export function openLocalDir(targetDir: string) {
  invoke<string>("show_in_folder", { targetDir: targetDir });
};

export function removeSymlink(target: string) {
  invoke<string>('remove_file', { targetFile: target })
    .then((response) => {
      console.debug(response);
      console.info('symlink removed!');
    })
    .catch((err) => console.error(err));
};

export function createSymlink(source: string, target: string) {
  invoke<string>('create_symlink',
    {
      sourceDir: source,
      targetDir: target
    }
  )
    .then((response) => {
      console.debug(response);
      console.info('symlink created!');
    })
    .catch((err) => console.error(err));
};

export const fetchMods = async (
  modDataDir: string,
  gameModDir: string,
  setMods?: React.Dispatch<React.SetStateAction<Mod[]>>
) => {
  const res = await invoke<Mod[]>('scan_mods', { sourceDir: modDataDir, targetDir: gameModDir})
    .then((response) => {
      console.log(response);
      if (setMods) {
        setMods(response);
      }
      return response;
    })
    .catch((err) => {
      console.error(err);
    });
  return res;
};