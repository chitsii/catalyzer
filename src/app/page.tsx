"use client";

import React, { useEffect, useState, useRef, ReactNode } from "react";
import { createId } from '@paralleldrive/cuid2';
import Link from "next/link";
import path from "path";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckIcon, MoreHorizontal, PencilIcon, Trash2Icon, XIcon } from 'lucide-react'
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorThemeSelector } from "@/components/theme-seletor";
import dynamic from "next/dynamic";

// import { ModsTable } from "@/components/datatable/mod-table/table-mods";
const ModsTable = dynamic(
  () => import("@/components/datatable/mod-table/table-mods").then((mod) => mod.ModsTable),
  { ssr: false }
);
import { useAtom } from 'jotai';
import {
  modDataDirPath,
  gameModDirPath,
  refreshMods,
  modsQ,
  profiles,
  Profile,
  store as AtomStore,
} from "@/components/atoms";
import { ask } from '@tauri-apps/api/dialog';
import { ScrollArea } from "@radix-ui/react-scroll-area";

import { LocalPathForm } from "@/components/input-card";
import { popUp } from "@/lib/utils";
import { unzipModArchive } from "@/lib/api";
import { profile } from "console";

const setUpDropEvent = async () => {
  if (typeof window === 'undefined') return
  import("@tauri-apps/api/window").then((mod) => {
    mod.appWindow.onFileDropEvent(async (ev) => {
      console.log(ev); // Debug
      if (ev.payload.type !== 'drop') {
        return;
      }
      const does_install = await ask('Add the dropped file to Mod Directory?', 'CDDA Launcher');
      if (!does_install) {
        return;
      }
      const [filepath] = ev.payload.paths;
      const modDataDir = AtomStore.get(modDataDirPath)

      if (path.extname(filepath) === '.zip') {
        unzipModArchive(
          filepath,
          path.join(modDataDir, path.basename(filepath))
        );
        return;
      }
      else if (path.parse(filepath).dir === modDataDir) {
        popUp('success', 'The file is already in the Mod Directory. If you want to update the mod, please create a new version or manually commit your change.');
      }
      else {
        popUp(
          'failed',
          `Handling ${path.extname(filepath) ? path.extname(filepath) : 'directory'} is not supported yet. Please drop .zip file.`
        );
      }
    })
  })
};


// const mock_profiles: Profile[] = [
//   {
//     name: '0.G',
//     gamePath: '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source',
//     modDataDirPath: '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source',
//     gameModDirPath: '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets',
//     activatedMods: [],
//     branchName: '0.G',
//     theme: 'dark'
//   }
// ]



type Props = {
  triggerChildren: ReactNode
  children: ReactNode
  onSelect: () => void
  onOpenChange: (open: boolean) => void
}

const DialogItem = ({ triggerChildren, children, onSelect, onOpenChange }: Props) => {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          className="p-3"
          onSelect={event => {
            event.preventDefault()
            onSelect && onSelect()
          }}
        >
          {triggerChildren}
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogPortal>
        <DialogContent>
          {children}
          <DialogClose asChild>
            <button className="IconButton" aria-label="Close">
              <XIcon />
            </button>
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
const ProfileSelector = (
  { currentProfile }: { currentProfile: Profile }
) => {
  const [profileList, setProfileList] = useAtom(profiles);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasOpenDialog, setHasOpenDialog] = useState(false);
  const dropdownTriggerRef = useRef<null | HTMLButtonElement>(null)
  const focusRef = useRef<null | HTMLButtonElement>(null)

  // ToDo: Remove this
  useEffect(() => {
    setProfileList(
      [
        {
          id: createId(),
          name: '0.G',
          gamePath: '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source',
          modDataDirPath: '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source',
          gameModDirPath: '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets',
          activatedMods: [],
          branchName: '0.G',
          theme: 'dark'
        }
      ]
    )

  }, []);

  const handleDialogItemSelect = () => {
    focusRef.current = dropdownTriggerRef.current
  }

  const handleDialogItemOpenChange = (open: boolean) => {
    setHasOpenDialog(open)
    if (open === false) {
      setDropdownOpen(false)
    }
  }

  const addProfile = (
    name: string,
    gamePath: string,
    modDataDirPath: string,
    gameModDirPath: string,
    branchName: string,
  ) => {
    const newProfile = {
      id: createId(),
      name: name,
      gamePath: gamePath,
      modDataDirPath: modDataDirPath,
      gameModDirPath: gameModDirPath,
      activatedMods: [],
      branchName: branchName,
    } satisfies Profile;
    setProfileList([...profileList, newProfile]);
  }
  const deleteProfile = (id: string) => {
    setProfileList(profileList.filter((p) => p.id !== id));
  }
  const updateProfile = (id: string, profile: Profile) => {
    setProfileList(profileList.map((p) => p.id === id ? profile : p));
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={(isOpen) => setDropdownOpen(isOpen)}>
        <DropdownMenuTrigger>
          <Button variant="ghost">
            <span>Profile: </span>
            <span className="bg-primary-foreground">{currentProfile.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          hidden={hasOpenDialog}
          onCloseAutoFocus={event => {
            if (focusRef.current) {
              focusRef.current.focus()
              focusRef.current = null
              event.preventDefault()
            }
          }}
        >
          <DropdownMenuLabel>Profiles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {
            profileList.length === 0
              ?
              <DropdownMenuItem>
                <span className="text-secondary">No Profiles</span>
              </DropdownMenuItem>
              :
              profileList.map((profile) => {
                return (
                  <DropdownMenuItem key={profile.id}>
                    <span>{profile.name}</span>
                    <DropdownMenuShortcut>
                      <span>{profile.branchName}</span>
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                )
              })
          }
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Add/Edit/Remove</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DialogItem
                  triggerChildren={
                    <>
                      <PencilIcon className="mr-4 h-4 w-4" />
                      <span>Add</span>
                    </>
                  }
                  onSelect={handleDialogItemSelect}
                  onOpenChange={handleDialogItemOpenChange}
                >
                  <DialogTitle className="DialogTitle">Add</DialogTitle>
                  <DialogDescription className="DialogDescription">
                    Add a new profile
                  </DialogDescription>
                  <form
                    onSubmit={(e: any) => {
                      const profileName = e.target['profileName'].value;
                      const gamePath = e.target['gamePath'].value;
                      const modDataDirPath = e.target['modDataDirPath'].value;
                      const gameModDirPath = e.target['gameModDirPath'].value;
                      const branchName = e.target['branchName'].value;
                      addProfile(profileName, gamePath, modDataDirPath, gameModDirPath, branchName);
                      console.log(profileList);
                      e.preventDefault();
                    }}>
                    <input
                      name="profileName"
                      type="text"
                      placeholder="Profile Name"
                      className="w-full p-2 my-2 border border-gray-300 rounded-md"
                    />
                    <input
                      name="gamePath"
                      type="text"
                      placeholder="Game Path"
                      className="w-full p-2 my-2 border border-gray-300 rounded-md"
                    />
                    <input
                      name="modDataDirPath"
                      type="text"
                      placeholder="Mod Data Directory Path"
                      className="w-full p-2 my-2 border border-gray-300 rounded-md"
                    />
                    <input
                      name="gameModDirPath"
                      type="text"
                      placeholder="Game Mod Directory Path"
                      className="w-full p-2 my-2 border border-gray-300 rounded-md"
                    />
                    <input
                      name="branchName"
                      type="text"
                      placeholder="Branch Name"
                      className="w-full p-2 my-2 border border-gray-300 rounded-md"
                    />
                    <Button type="submit">OK</Button>
                  </form>
                </DialogItem>
                <DropdownMenuSeparator />
                <DialogItem
                  triggerChildren={
                    <>
                      <PencilIcon className="mr-4 h-4 w-4" />
                      <span>Edit/Remove</span>
                    </>
                  }
                  onSelect={handleDialogItemSelect}
                  onOpenChange={handleDialogItemOpenChange}
                >
                  <DialogTitle className="DialogTitle">Edit/Remove profiles</DialogTitle>
                  <DialogDescription className="DialogDescription">
                    Edit or remove profiles
                  </DialogDescription>
                </DialogItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}


export default function Home() {
  // const [profileList, setProfileList] = useAtom(profiles);
  const [currentProfile, setCurrentProfile] = useState(
    {
      id: createId(),
      name: '0.G',
      gamePath: '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source',
      modDataDirPath: '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/source',
      gameModDirPath: '/Users/fanjiang/programming/rust-lang/tauriv2/my-app/experiments/targets',
      activatedMods: [],
      branchName: '0.G',
      theme: 'dark'
    } as Profile
  );

  const [{ data, isPending, isError }] = useAtom(modsQ);
  const [_, refresh] = useAtom(refreshMods);

  useEffect(() => {
    const setUpDropEventHander = async () => {
      await setUpDropEvent();
    }
    setUpDropEventHander();
  }, []);

  return (
    <main>
      {/* <img src={`/app_icon.webp`} className="w-24 h-24"/> */}
      <div className="w-full overflow-hidden select-none bg-muted/40">
        <div className="w-full h-[100px]">
          <ProfileSelector
            currentProfile={currentProfile}
          />
        </div>
        <div className="w-full">
          <Tabs
            defaultValue="mods"
            className="w-full h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mods" className="text-lg"
                onClick={() => {
                  refresh();
                }}
              >
                Mod一覧
              </TabsTrigger>
              <TabsTrigger
                value="setting"
                className="text-lg"
              >設定
              </TabsTrigger>
              <TabsTrigger value="games">
                Games
              </TabsTrigger>
            </TabsList>
            <TabsContent value="mods">
              <div className="bg-muted/40">
                <ModsTable
                  mods={data!}
                // setMods={setMods}
                />
              </div>
            </TabsContent>
            <TabsContent value="setting">
              <div className="flex min-h-[calc(97vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="mx-auto grid w-full max-w-6xl gap-2">
                  <h1 className="text-3xl font-semibold">設定</h1>
                </div>
                <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
                  <nav
                    className="grid gap-4 text-sm text-muted-foreground" x-chunk="dashboard-04-chunk-0"
                  >
                    <Link href="#mod_management_setting" className="font-semibold text-primary">
                      Mod管理
                    </Link>
                    <Link href="#theme_setting" className="font-semibold text-primary">
                      配色
                    </Link>
                  </nav>
                  <ScrollArea>
                    <div className="grid gap-2" id="mod_management_setting">
                      <p className="font-bold text-xl">Mod管理</p>
                      <LocalPathForm
                        title="Mod保存先"
                        description="Modの集中管理用の任意のディレクトリ"
                        inputAtom={modDataDirPath}
                      />
                      <LocalPathForm
                        title="ゲームのMod読み込み先"
                        description="ゲームがModを読み込むディレクトリ"
                        inputAtom={gameModDirPath}
                      />
                    </div>
                    <br />
                    <div className="grid gap-2" id="theme_setting">
                      <p className="font-bold text-xl">配色</p>
                      <Card>
                        <CardHeader>
                          <CardTitle>配色</CardTitle>
                          <CardDescription>
                            配色を選択します
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ColorThemeSelector />
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="games">
              <form onSubmit={
                (e: any) => {
                  e.preventDefault();
                  console.log(e.target);
                  console.log(e.target["selectedGameVersion"].value);
                  // ToDo: ゲームのバージョンを選択して起動する

                }
              }>
                <div className="grid gap-4 text-lg">
                  <select name="selectedGameVersion">
                    <option value="cdda">Cataclysm: Dark Days Ahead</option>
                    <option value="cdda_experimental">Stable builds</option>
                    <option value="cdda_launcher">Experimentsl builds</option>
                  </select>
                </div>
                <button type="submit">Submit</button>
              </form>
            </TabsContent>
            <TabsContent value="releases">
              <Link
                href="https://github.com/CleverRaven/Cataclysm-DDA/releases"
                className="text-primary"
                target="_blank"
              >
                Cataclysm: Dark Days Ahead Releases
              </Link>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main >
  );
}


