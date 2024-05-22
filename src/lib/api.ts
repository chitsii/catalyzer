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

type Command =
"git_init" |
"git_commit_changes" |
"git_reset_changes" |
"git_list_branches" |
"git_checkout";

export function GitCmd(command: Command, args: GitArgs) {
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
  invoke<string>("open_dir", { targetDir: targetDir });
};

export function openModData() {
  invoke<string>("open_mod_data");
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

export const fetchMods = async () => {
  // if (typeof window === "undefined") return [];
  const res = await invoke<Mod[]>('scan_mods')
    .then((response) => {
      console.log('fetchMods', response);
      return response;
    })
    .catch((err) => {
      console.error(err);
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
  // if (typeof window === "undefined") return { language: 'ja', profile: [] };
  const res = await invoke<Settings>('get_settings')
    .then((response) => {
      console.log('getSetting', response);
      return response;
    })
    .catch((err) => {
      console.error(err);
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
