import { getModsProps, getMockData } from "@/components/datatable/table-mods/table-mods";
import { Mod } from "@/components/datatable/table-mods/columns";
import { Logger } from "@/components/log-console";
import { invoke, InvokeArgs } from "@tauri-apps/api/tauri";
import path from "path";
import React from "react";


export function fListModDirs(
  source_ref: React.RefObject<HTMLInputElement>,
  logger: Logger,
  setModDirectories: React.Dispatch<React.SetStateAction<string[]>>
) {
  return async () => {
    invoke<string[]>('list_mod_directories', { sourceDir: source_ref.current?.value.toString() })
      .then((response) => {
        logger.info(JSON.stringify(response));
        setModDirectories(response);
      })
      .catch((err) => logger.error(err));
  };
}

type GitApi = "init_local_repository" | "show_changes" | "commit_changes" | "reset_changes" | "list_branches" | "checkout_branch"
export function GitCmdBase(targetDir: string) {
  return async (command: GitApi) => {
    if (!targetDir) return;
    invoke<string>(command, { targetDir: targetDir })
      .then((response) => {
        console.debug(response);
        console.info(`executed ${command}' on ${targetDir}.`);
      })
      .catch((err) => console.error(err));
  };
}

export function openLocalDir(targetDir: string) {
  invoke<string>("show_in_folder", { targetDir: targetDir });
}

export function fRemoveAllSymlink(symlinkList: string[], logger: Logger) {
  return async () => {
    symlinkList.map((link) => {
      invoke<string>('remove_file', { targetFile: link })
        .then((response) => {
          logger.debug(response);
          logger.info('symlink removed!');
        })
        .catch((err) => logger.error(err));
    });
  };
}

export function fCreateAllSymlinks(listModDirectories: () => Promise<void>, target_ref: React.RefObject<HTMLInputElement>, logger: Logger, modDirectories: string[]) {
  return async () => {
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
        .catch((err) => logger.error(err));
    });
  };
}

export function fRemoveSymlink(target_ref: React.RefObject<HTMLInputElement>, subdir_ref: React.RefObject<HTMLInputElement>, logger: Logger) {
  return async () => {
    const target_root = target_ref.current?.value;
    const subdir = subdir_ref.current?.value;

    if (!target_root || !subdir) {
      logger.error('source and target paths are required!');
      return;
    }

    invoke<string>('remove_file', { targetFile: path.join(target_root, subdir) })
      .then((response) => {
        logger.debug(response);
        logger.info('symlink removed!');
      })
      .catch((err) => logger.error(err));
  };
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
      console.info('symlink created!');
    })
    .catch((err) => console.error(err));
}

export function fCreateSymlink(source_ref: React.RefObject<HTMLInputElement>, target_ref: React.RefObject<HTMLInputElement>, subdir_ref: React.RefObject<HTMLInputElement>, logger: Logger) {
  return async () => {
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
      .catch((err) => logger.error(err));
  };
}

export function fListSymLinks(target_ref: React.RefObject<HTMLInputElement>, logger: Logger, setSymlinkList: React.Dispatch<React.SetStateAction<string[]>>) {
  return async () => {
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
}

export const getMods = (
  { mods, setMods }: getModsProps
) => {
  invoke<Mod[]>('scan_mods', { sourceDir: "/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source" })
    .then((response) => {
      console.log(response);
      setMods(response);
    })
    .catch((err) => {
      console.error(err);
      setMods(getMockData());
    });
};

