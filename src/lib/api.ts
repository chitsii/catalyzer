import { Mod } from "@/components/datatable/mod-table/columns";
import { popUp } from "@/lib/utils";
import { createId } from "@paralleldrive/cuid2";
import { Settings, Profile } from "@/components/atoms";

import { invoke_safe } from "@/lib/invoke-safe";
import { debug, trace, info, error, attachConsole, warn } from "@tauri-apps/plugin-log";


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
const cloneModRepo = async (repoUrl: string) => await invoke_safe("git_clone_mod_repo", { url: repoUrl });
const listBranches = async (targetDir: string) =>
  await invoke_safe<string[]>("git_list_branches", { targetDir: targetDir });
const gitFetch = async (targetDir: string) => await invoke_safe("git_fetch_origin", { targetDir: targetDir });
const gitFetchAllMods = async () => await invoke_safe("git_fetch_all_mods", {});

const installMod = async (moddata_dir: string) => await invoke_safe("install_mod", { modDataPath: moddata_dir });
const installAllMods = async () => await invoke_safe("install_all_mods", {});
const uninstallMods = async (moddata_dir: string) => await invoke_safe("uninstall_mod", { modDataPath: moddata_dir });
const uninstallAllMods = async () => await invoke_safe("uninstall_all_mods", {});

const listMods = async () => await invoke_safe<Mod[]>("scan_mods", {});

const unzipModArchive = async (src: string, existsOk?: boolean) =>
  await invoke_safe("unzip_mod_archive", { src: src, existsOk: existsOk });

const getSettings = async () => await invoke_safe<Settings>("get_settings", {});
const addProfile = async (name: string, gamePath?: string) => {
  const args = {
    id: createId(),
    name: name,
    gamePath: gamePath,
  };
  const res = await invoke_safe<Profile>("add_profile", args);
  return res;
};
const removeProfile = async (profileId: string) => await invoke_safe("remove_profile", { profileId: profileId });
const editProfile = async (profileId: string, name: string, gamePath?: string | null) => {
  const args = {
    profileId: profileId,
    name: name,
    gamePath: gamePath,
  };
  await invoke_safe("edit_profile", args);
};
const setProfileActive = async (profileId: string) => await invoke_safe("set_profile_active", { profileId: profileId });

import { useTranslation } from "@/i18n/config"; //"next-i18next";
const setLanguage = async (i18n: ReturnType<typeof useTranslation>["i18n"], language: string) => {
  if (language === i18n.resolvedLanguage) return;

  const set_language = await invoke_safe("set_launcher_language", { lang: language });
  if (set_language !== i18n.resolvedLanguage) {
    i18n.changeLanguage(language);
  } else {
    popUp("failed", "failed to set language.");
  }
};

const tailLog = async () => await invoke_safe<String[]>("tail_log", {});

const cddaStableReleases = async (num: number) => await invoke_safe("cdda_get_stable_releases", { num: num });
const cddaLatestReleases = async (num: number) => await invoke_safe("cdda_get_latest_releases", { num: num });
const isCddaCloned = async () => await invoke_safe("cdda_is_cloned", {});
const cddaPullRebase = async () => await invoke_safe("cdda_pull_rebase", {});

const getPlatform = async (): Promise<string> => await invoke_safe("get_platform", {});

const unzipArchive = async (src: string, dest: string) =>
  await invoke_safe("unzip_archive", { src: src, destDir: dest });

const printModJsonErrors = async () => await invoke_safe("inspect_mods", {});

export {
  // re-export
  invoke_safe as invoke_safe,

  // settings
  getSettings,
  getPlatform,
  setLanguage,
  addProfile,
  setProfileActive,
  removeProfile,
  editProfile,

  // git for cdda
  cddaStableReleases,
  cddaLatestReleases,
  isCddaCloned,
  cddaPullRebase,

  // git general purpose
  gitFetch,
  gitFetchAllMods,
  cloneModRepo,
  gitCommand,
  listBranches,

  // zip
  unzipModArchive,
  unzipArchive,

  // utility
  launchGame,
  openLocalDir,
  openModData,
  installMod,
  installAllMods,
  uninstallMods,
  uninstallAllMods,
  listMods,
  tailLog,
  printModJsonErrors,
};
