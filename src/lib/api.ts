import { Mod } from "@/components/datatable/mod-table/columns";
import { invoke, InvokeArgs } from "@tauri-apps/api/tauri";
import React from "react";
import { popUp } from "@/lib/utils";
import { createId } from "@paralleldrive/cuid2";


type GitArgs = {
  targetDir: string;
  sourceBranch?: string;
  targetBranch?: string;
  createIfUnexist?: boolean;
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
    .catch((err) => {
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
  const res = await invoke<Mod[]>('scan_mods', { sourceDir: modDataDir, targetDir: gameModDir })
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

export const listProfiles = async () => {
  const res = await invoke<string[]>('list_profiles')
    .then((response) => {
      console.log(response);
      return response;
    })
    .catch((err) => {
      console.error(err);
    });
  return res ? res : [];
}
export const addProfile = async (
  name: string,
  gamePath: string,
  profilePath: string,
  branchName: string,
  theme?: string
) => {
  const args: InvokeArgs = {
    id: createId(),
    name: name,
    gamePath: gamePath,
    profilePath: profilePath,
    branchName: branchName,
    theme: theme,
  };
  invoke<string>('add_profile', args)
    .then((response) => {
      popUp('success', 'Profile added!');
    })
    .catch((err) => {
      popUp('failed', err);
    });
}

import { Settings } from "@/components/atoms";

export const getSettings = async () => {
  const res = await invoke<Settings>('get_settings')
    .then((response) => {
      console.log(response);
      return response;
    })
    .catch((err) => {
      console.error(err);
    });
  return res ? res : { language: 'en', profile: [] };
}

export const setProfile = async (profileId: string) => {
  invoke<string>('set_active_profile', { profileId: profileId })
    .then((response) => {
      popUp('success', response);
    })
    .catch((err) => {
      popUp('failed', err);
    });
}

export const removeProfile = async (profileId: string) => {
  invoke<string>('remove_profile', { profileId: profileId })
    .then((response) => {
      popUp('success', response);
    })
    .catch((err) => {
      popUp('failed', err);
    });
}