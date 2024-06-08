import { Mod } from "@/components/datatable/mod-table/columns";
import { popUp } from "@/lib/utils";
import { createId } from "@paralleldrive/cuid2";
import { error, info, debug } from "tauri-plugin-log-api";
import { invoke } from "@tauri-apps/api/tauri";

type GitArgs = {
  targetDir: string;
  sourceBranch?: string;
  targetBranch?: string;
  createIfUnexist?: boolean;
};

type Command = "git_init" | "git_commit_changes" | "git_reset_changes" | "git_list_branches" | "git_checkout";

export async function GitCmd(command: Command, args: GitArgs) {
  const isClient = typeof window !== "undefined";
  isClient &&
    (await invoke<string>(command, args)
      .then((response) => {
        popUp("success", `'${command}' succeeded!`);
      })
      .catch((err) => {
        error(err);
        popUp("failed", err);
      }));
}

// export async function openInBrowser(url: string) {
//   const isClient = typeof window !== "undefined";
//   isClient && invoke<string>("open_in_browser", { url: url });
// }

export async function launchGame() {
  const isClient = typeof window !== "undefined";
  isClient && invoke<string>("launch_game");
}

export async function openLocalDir(targetDir: string) {
  info(`open mod data directory: ${targetDir}`);

  const isClient = typeof window !== "undefined";
  isClient && invoke<string>("open_dir", { targetDir: targetDir });
}

export async function openModData() {
  const isClient = typeof window !== "undefined";
  isClient && (await invoke<string>("open_mod_data"));
}

export async function list_branches(targetDir: string) {
  const isClient = typeof window !== "undefined";
  if (!isClient) return [];

  const res = await invoke<string[]>("git_list_branches", {
    targetDir: targetDir,
  })
    .then((response: string[]) => {
      return response;
    })
    .catch((err) => {
      error(err);
      popUp("failed", err);
    });
  return res ? res : [];
}

export async function installMod(mod_data_path: string) {
  const isClient = typeof window !== "undefined";
  isClient &&
    (await invoke<string>("install_mod", { modDataPath: mod_data_path })
      .then(() => {
        info(`mod installed: ${mod_data_path}.`);
      })
      .catch((err) => {
        error(err);
        popUp("failed", err);
      }));
}
export async function uninstallMod(mod_data_path: string) {
  const isClient = typeof window !== "undefined";
  isClient &&
    (await invoke<string>("uninstall_mod", { modDataPath: mod_data_path })
      .then(() => {
        info(`mod uninstalled: ${mod_data_path}.`);
      })
      .catch((err) => {
        error(err);
        popUp("failed", err);
      }));
}

export const fetchMods = async () => {
  const isClient = typeof window !== "undefined";
  if (!isClient) return [];

  const res = await invoke<Mod[]>("scan_mods")
    .then((response) => {
      info(`scan mods. found: ${response.length}`);
      return response;
    })
    .catch((err) => {
      error(err);
      throw new Error(`found error: ${err}`);
    });
  return res;
};

export const unzipModArchive = async (src: string, existsOk: boolean = false) => {
  const isClient = typeof window !== "undefined";
  isClient &&
    (await invoke<string>("unzip_mod_archive", {
      src: src,
      existsOk: existsOk,
    })
      .then((response) => {
        popUp("success", "Mod unzipped!");
      })
      .catch((err) => {
        popUp("failed", err);
      }));
};

export const addProfile = async (name: string, gamePath: string) => {
  const args = {
    id: createId(),
    name: name,
    gamePath: gamePath,
  };
  const isClient = typeof window !== "undefined";
  isClient &&
    (await invoke<string>("add_profile", args)
      .then((response) => {
        popUp("success", "Profile added!");
      })
      .catch((err) => {
        popUp("failed", err);
      }));
};

import { Settings } from "@/components/atoms";

export const getSettings = async () => {
  const isClient = typeof window !== "undefined";
  if (!isClient) return null;

  const res = await invoke<Settings>("get_settings")
    .then((response) => {
      info(`refresh settings.`);
      return response;
    })
    .catch((err) => {
      error(err);
      // throw new Error(err);
      throw new Error(`found error: ${err}`);
    });
  return res;
};

export const setProfileActive = async (profileId: string) => {
  const isClient = typeof window !== "undefined";
  isClient &&
    (await invoke<string>("set_profile_active", { profileId: profileId })
      .then((response) => {
        popUp("success", response);
      })
      .catch((err) => {
        popUp("failed", err);
      }));
};

export const removeProfile = async (profileId: string) => {
  const isClient = typeof window !== "undefined";
  isClient &&
    (await invoke<string>("remove_profile", { profileId: profileId })
      .then((response) => {
        popUp("success", response);
      })
      .catch((err) => {
        popUp("failed", err);
      }));
};

export const editProfile = async (profileId: string, name: string, gamePath: string) => {
  const args = {
    profileId: profileId,
    name: name,
    gamePath: gamePath,
  };

  const isClient = typeof window !== "undefined";
  isClient &&
    invoke<string>("edit_profile", args)
      .then((response) => {
        popUp("success", response);
      })
      .catch((err) => {
        popUp("failed", err);
      });
};

export const tailLog = async () => {
  const isClient = typeof window !== "undefined";
  if (!isClient) return [];
  const res = await invoke<string[]>("tail_log")
    .then((response) => {
      info("read log file.");
      return response;
    })
    .catch((err) => {
      error(err);
    });
  return res ? res : [];
};
