import { Logger } from "@/components/loggingArea";
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
export function fGitCmdBase(source_ref: React.RefObject<HTMLInputElement>, subdir_ref: React.RefObject<HTMLInputElement>, logger: Logger) {
  return async (command: string) => {
    const target_root_dir = source_ref.current?.value;
    const subdir = subdir_ref.current?.value;

    if (!target_root_dir || !subdir) {
      logger.error('source and target paths are required!');
      return;
    }

    invoke<string>(command, { targetDir: path.join(target_root_dir, subdir) })
      .then((response) => {
        logger.debug(response);
        logger.info(`executed ${command}' on ${target_root_dir}/${subdir}.`);
      })
      .catch((err) => logger.error(err));
  };
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

