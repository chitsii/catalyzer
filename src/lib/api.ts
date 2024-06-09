import { Mod } from "@/components/datatable/mod-table/columns";
import { popUp } from "@/lib/utils";
import { createId } from "@paralleldrive/cuid2";
import { error, info, debug } from "tauri-plugin-log-api";
import { invoke } from "@tauri-apps/api/tauri";
import { Settings } from "@/components/atoms";

/// invoke_safe is a wrapper to safely execute invoke.
/// We can only 'invoke' after window load when Next.js is used.
export async function invoke_safe(command: string, arg_obj: any, default_response: any = null) {
  const isClient = typeof window !== "undefined";
  if (!isClient) return default_response;
  let res: any = await invoke(command, arg_obj)
    .then(() => {
      info(`invoke: ${command} done.`);
    })
    .catch((err) => {
      error(err);
      popUp("failed", err);
      throw new Error(`found error: ${err}`);
    });
  return !!res ? res : default_response;
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
const uninstallMod = async (moddata_dir: string) => await invoke_safe("uninstall_mod", { modDataPath: moddata_dir });
const fetchMods = async () => await invoke_safe("scan_mods", []);
const unzipModArchive = async (src: string, existsOk?: boolean) =>
  await invoke_safe("unzip_mod_archive", { src: src, existsOk: existsOk });
const getSettings = async () => await invoke_safe("get_settings", {});
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
const tailLog = async () => await invoke_safe("tail_log", []);

export {
  gitCommand,
  getSettings,
  launchGame,
  openLocalDir,
  openModData,
  listBranches,
  installMod,
  uninstallMod,
  fetchMods,
  unzipModArchive,
  addProfile,
  setProfileActive,
  removeProfile,
  editProfile,
  tailLog,
};
