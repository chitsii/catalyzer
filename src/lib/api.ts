import { Mod } from "@/components/datatable/mod-table/columns";
import { invoke, InvokeArgs } from "@tauri-apps/api/tauri";
import React from "react";
import { popUp } from "@/lib/utils";
import { createId } from "@paralleldrive/cuid2";
import { error, info, debug } from "tauri-plugin-log-api";


type GitArgs = {
  targetDir: string;
  sourceBranch?: string;
  targetBranch?: string;
  createIfUnexist?: boolean;
};

type Command =
"git_init" |
"git_commit_changes" |
"git_reset_changes" |
"git_list_branches" |
"git_checkout";

export function GitCmd(command: Command, args: GitArgs) {
  invoke<string>(command, args)
    .then((response) => {
      popUp("success", `'${command}' succeeded!`);
    })
    .catch((err) => {
      error(err);
      popUp("failed", err);
    });
};

export function openLocalDir(targetDir: string) {
  info(`open mod data directory: ${targetDir}`);
  invoke<string>("open_dir", { targetDir: targetDir });
};

export function openModData() {

  invoke<string>("open_mod_data");
};

export function uninstallMod(target: string) {
  invoke<string>('uninstall_mod', { targetFile: target })
    .then((response) => {
      // debug(response);
      info(`mod uninstalled: ${target}.`);
    })
    .catch((err) => {
      error(err);
      popUp("failed", err);
    });
};

export async function list_branches(targetDir: string) {
  const res = await invoke<string[]>('git_list_branches', { targetDir: targetDir })
    .then((response: string[]) => {
      // debug(response.join(","));
      return response;
    })
    .catch((err) => {
      error(err);
      popUp("failed", err);
    });
  return res ? res : [];
}

export function unistallMod(source: string, target: string) {
  invoke<string>('install_mod',
    {
      sourceDir: source,
      targetDir: target
    }
  )
    .then((response) => {
      // debug(response);
    })
    .catch((err) => {
      error(err);
      popUp("failed", err);
    });
};

export const fetchMods = async () => {
  // if (typeof window === "undefined") return [];
  const res = await invoke<Mod[]>('scan_mods')
    .then((response) => {
      info(`scan mods. found: ${response.length}`);
      return response;
    })
    .catch((err) => {
      error(err);
      throw new Error(err);
    });
  return res;
};

export const unzipModArchive = async (src: string, dest: string, existsOk: boolean = false) => {
  if (typeof window === "undefined") return;
  invoke<string>('unzip_mod_archive', { src: src, dest: dest, existsOk: existsOk })
    .then((response) => {
      popUp('success', 'Mod archive extracted at ' + dest);
    })
    .catch((err) => {
      popUp('failed', err);
    });
}

export const addProfile = async (
  name: string,
  gamePath: string,
) => {
  const args: InvokeArgs = {
    id: createId(),
    name: name,
    gamePath: gamePath,
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
      info(`refresh settings.`);
      return response;
    })
    .catch((err) => {
      error(err);
      throw new Error(err);
    });
    return res
  // return res ? res : { language: 'ja', mod_data_path: '', game_config_path: '', profiles: [] };
}

export const setProfileActive = async (profileId: string) => {
  invoke<string>('set_profile_active', { profileId: profileId })
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

export const editProfile = async (
  profileId: string,
  name: string,
  gamePath: string,
) => {
  const args: InvokeArgs = {
    profileId: profileId,
    name: name,
    gamePath: gamePath,
  };
  invoke<string>('edit_profile', args)
    .then((response) => {
      popUp('success', response);
    })
    .catch((err) => {
      popUp('failed', err);
    });
}

export const tailLog = async () => {
  const res = await invoke<string[]>('tail_log')
    .then((response) => {
      info("read log file.");
      return response;
    })
    .catch((err) => {
      error(err);
    });
  return res ? res : [];
}