import { Mod } from "@/components/datatable/mod-table/columns";
import { popUp } from "@/lib/utils";
import { createId } from "@paralleldrive/cuid2";
import { error, info, debug } from "tauri-plugin-log-api";
import { invoke } from "@tauri-apps/api/tauri";
import { Settings } from "@/components/atoms";

/// invoke_safe is a wrapper to safely execute invoke.
/// We can only 'invoke' after window load when Next.js is used.
export async function invoke_safe<T>(command: string, arg_obj?: any, default_response?: T | undefined): Promise<T> {
  const isClient = typeof window !== "undefined";
  if (!isClient) return default_response as T;

  try {
    debug(`start invoke: ${command} with args: ${JSON.stringify(arg_obj)}`);
    const res = await invoke<T>(command, arg_obj);
    info(`invoke: ${command} done.`);
    return res;
  } catch (err) {
    error(JSON.stringify(err));
    popUp("failed", `failed to execute command: ${command}`);
    throw new Error(`found error: ${err}`);
  }
}

const launchGame = async () => await invoke_safe("launch_game", {});

const openLocalDir = async (targetDir: string) => await invoke_safe("open_dir", { targetDir: targetDir });

const openModData = async () => await invoke_safe("open_mod_data", {});

const gitCommand = async (
  command: "git_init" | "git_commit_changes" | "git_reset_changes" | "git_list_branches" | "git_checkout",
  args: {
    targetDir: string;
    sourceBranch?: string;
    targetBranch?: string;
    createIfUnexist?: boolean;
  },
) => await invoke_safe(command, args);

const listBranches = async (targetDir: string) => await invoke_safe("git_list_branches", { targetDir: targetDir }, []);

const installMod = async (moddata_dir: string) => await invoke_safe("install_mod", { modDataPath: moddata_dir });
const installAllMods = async () => await invoke_safe("install_all_mods", {});
const uninstallMod = async (moddata_dir: string) => await invoke_safe("uninstall_mod", { modDataPath: moddata_dir });
const uninstallAllMods = async () => await invoke_safe("uninstall_all_mods", {});

const fetchMods = async () => await invoke_safe<Mod[]>("scan_mods", {}, []);

const unzipModArchive = async (src: string, existsOk?: boolean) =>
  await invoke_safe("unzip_mod_archive", { src: src, existsOk: existsOk });

const getSettings = async () => await invoke_safe<Settings>("get_settings");

const addProfile = async (name: string, gamePath: string) => {
  const args = {
    id: createId(),
    name: name,
    gamePath: gamePath,
  };
  await invoke_safe("add_profile", args);
};

const removeProfile = async (profileId: string) => await invoke_safe("remove_profile", { profileId: profileId });

const editProfile = async (profileId: string, name: string, gamePath: string) => {
  const args = {
    profileId: profileId,
    name: name,
    gamePath: gamePath,
  };
  await invoke_safe("edit_profile", args);
};

const setProfileActive = async (profileId: string) => await invoke_safe("set_profile_active", { profileId: profileId });

const tailLog = async () => await invoke_safe<String[]>("tail_log", {}, []);

export {
  gitCommand,
  getSettings,
  launchGame,
  openLocalDir,
  openModData,
  listBranches,
  installMod,
  installAllMods,
  uninstallMod,
  uninstallAllMods,
  fetchMods,
  unzipModArchive,
  addProfile,
  setProfileActive,
  removeProfile,
  editProfile,
  tailLog,
};
