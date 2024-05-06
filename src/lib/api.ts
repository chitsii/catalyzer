import { Mod } from "@/components/datatable/mod-table/columns";
import { invoke, InvokeArgs } from "@tauri-apps/api/tauri";
import React from "react";
import { popUp } from "@/lib/utils";

type GitArgs = {
  targetDir: string;
  sourceBranch?: string;
  targetBranch?: string;
  createIfUnexist?: boolean;
  cleanup?: boolean;
};
export function GitCmd(command: string, args: GitArgs) {
    invoke<string>(command, args)
      .then((response) => {
        console.debug(response);
        popUp("success", `operation '${command}' succeeded!`);
      })
      .catch((err) => {
        console.error(err);
        popUp("failed", err);
      });
  };

export function openLocalDir(targetDir: string) {
  invoke<string>("show_in_folder", { targetDir: targetDir });
};

export function removeSymlink(target: string) {
  invoke<string>('remove_symlink', { targetFile: target })
    .then((response) => {
      console.debug(response);
      console.info('symlink removed!');
      // popUp("success", "Removed symblic link.")
    })
    .catch((err) =>
      {
        console.error(err);
        popUp("failed", err);
      });
};

export async function list_branches(targetDir: string) {
  const res = await invoke<string[]>('list_branches', { targetDir: targetDir })
    .then((response: string[]) => {
      console.debug(response);
      return response;
    })
    .catch((err) => {
      console.error(err);
      popUp("failed", err);
    });
    return res ? res : [];
}

export function createSymlink(source: string, target: string) {
  invoke<string>('create_symlink',
    {
      sourceDir: source,
      targetDir: target
    }
  )
    .then((response) => {
      console.debug(response);
      // popUp("success", "Created symbolic link.")
    })
    .catch((err) => {
      console.error(err);
      popUp("failed", err);
    });
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

export const unzipModArchive = async (src: string, dest: string, existsOk: boolean = false) => {
  invoke<string>('unzip_mod_archive', { src: src, dest: dest, existsOk: existsOk })
    .then((response) => {
      popUp('success', 'Mod archive extracted at ' + dest);
    })
    .catch((err) => {
      popUp('failed', err);
    });
}