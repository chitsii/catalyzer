"use client";

import React, { useEffect, useState, useRef, ReactNode } from "react";
import Link from "next/link";
import path from "path";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input";
import { Menu, CheckIcon, MoreHorizontal, PencilIcon, Trash2Icon, XIcon } from 'lucide-react'
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogContent,
  DialogDescription,
  // DialogPortal,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorThemeSelector } from "@/components/theme-seletor";
import dynamic from "next/dynamic";

import { ModsTable } from "@/components/datatable/mod-table/table-mods";
// const ModsTable = dynamic(
//   () => import("@/components/datatable/mod-table/table-mods").then((mod) => mod.ModsTable),
//   { ssr: false }
// );
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
import { toast } from "sonner";


import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const profileFormSchema = z.object({
  name: z.string().min(1).max(45).trim(),
  gamePath: z.string().min(1).max(255).trim(),
  profilePath: z.string().min(1).max(255).trim(),
  branchName: z.string().min(1).max(20).regex(
    /^[a-zA-Z0-9_\-]+$/,
    'Invalid branch name. Only alphanumeric characters, hyphen and underscore are allowed.'
  ).trim(),
})

type ProfileFormProps = {
  profileList: Profile[]
  setProfileList: (profileList: Profile[]) => void,
}
const ProfileForm = (
  { profileList, setProfileList }: ProfileFormProps
) => {
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      gamePath: '',
      profilePath: '',
      branchName: '',
    }
  });

  const onSubmit = (values: z.infer<typeof profileFormSchema>) => {
    console.log('onSubmit');
    console.log(values);
    const addProfile = (
      name: string,
      gamePath: string,
      rootPath: string,
      branchName: string,
    ) => {
      const newProfile = new Profile(
        name,
        gamePath,
        rootPath,
        [],
        branchName,
      );
      setProfileList([...profileList, newProfile]);
      form.reset();
      popUp('success', 'Profile added successfully');
      console.log('Profile added successfully', JSON.stringify(newProfile));
      console.log('length of profileList', profileList.length);
    };
    console.log('length of profileList', profileList.length);
    addProfile(values.name, values.gamePath, values.profilePath, values.branchName);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">プロファイル名</FormLabel>
              <FormControl>
                <Input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                  {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="gamePath"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">CDDAフォルダパス</FormLabel>
              <FormControl>
                <Input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                  {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="profilePath"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">プロファイルデータパス</FormLabel>
              <FormControl>
                <Input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                  {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="branchName"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">断面名称(branch name)</FormLabel>
              <FormControl>
                <Input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                  {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}

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

type DialogItemProps = {
  triggerChildren: ReactNode
  children: ReactNode
  onSelect: () => void
  onOpenChange: (open: boolean) => void
}
const DialogItem = ({ triggerChildren, children, onSelect, onOpenChange }: DialogItemProps) => {
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
      <DialogContent
        onInteractOutside={(e) => { e.preventDefault(); }}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

type ProfileSelectorProps = {
  currentProfile: Profile,
  setCurrentProfile: (profile: Profile) => void,
  profileList: Profile[],
  setProfileList: (profileList: Profile[]) => void,
  className?: string
}
const ProfileSelector = ({
  currentProfile,
  setCurrentProfile,
  profileList,
  setProfileList,
  className
}: ProfileSelectorProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasOpenDialog, setHasOpenDialog] = useState(false);
  const dropdownTriggerRef = useRef<null | HTMLButtonElement>(null)
  const focusRef = useRef<null | HTMLButtonElement>(null)

  const handleDialogItemSelect = () => {
    focusRef.current = dropdownTriggerRef.current
  }
  const handleDialogItemOpenChange = (open: boolean) => {
    setHasOpenDialog(open)
    if (open === false) {
      setDropdownOpen(false)
    }
  }
  const selectProfile = (id: string) => {
    const profile = profileList.find((p) => p.id === id);
    if (profile) {
      setCurrentProfile(profile);
    }
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={(isOpen) => setDropdownOpen(isOpen)}>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn("flex items-center gap-2", className)}
            ref={dropdownTriggerRef}>
            <Menu />
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
          <DropdownMenuLabel>プロファイル切替</DropdownMenuLabel>
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
                  <DropdownMenuItem key={profile.id}
                    onClick={() => selectProfile(profile.id)}
                  >
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
              <span>...</span>
            </DropdownMenuSubTrigger>
            {/* <DropdownMenuPortal> */}
            <DropdownMenuSubContent>
              <DialogItem
                triggerChildren={
                  <>
                    <PencilIcon className="mr-4 h-4 w-4" />
                    <span>Add Profile</span>
                  </>
                }
                onSelect={handleDialogItemSelect}
                onOpenChange={handleDialogItemOpenChange}
              >
                <DialogTitle className="DialogTitle">Add</DialogTitle>
                <DialogDescription className="DialogDescription">
                  Add a new profile
                </DialogDescription>
                <ProfileForm
                  profileList={profileList}
                  setProfileList={setProfileList}
                />
              </DialogItem>
              <DropdownMenuSeparator />
              <DialogItem
                triggerChildren={
                  <>
                    <PencilIcon className="mr-4 h-4 w-4" />
                    <span>Remove Profile</span>
                  </>
                }
                onSelect={handleDialogItemSelect}
                onOpenChange={handleDialogItemOpenChange}
              >
                <DialogTitle className="DialogTitle">Manage Profiles</DialogTitle>
                <DialogDescription className="DialogDescription">
                  Edit or remove profiles.
                </DialogDescription>
              </DialogItem>
            </DropdownMenuSubContent>
            {/* </DropdownMenuPortal> */}
          </DropdownMenuSub>

        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

export default function Home() {
  const [profileList, setProfileList] = useAtom(profiles);

  // TODO: Implement profile selection
  const [currentProfile, setCurrentProfile] = useState(profileList[0]);

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
      <div className="w-full overflow-hidden select-none bg-muted/40">
        <div className="flex w-full h-[100px] gap-8 p-4 items-center">
          <ProfileSelector
            currentProfile={currentProfile}
            setCurrentProfile={setCurrentProfile}
            profileList={profileList}
            setProfileList={setProfileList}
          />
          <div className="flex-grow">
            <p className="text-xl font-semibold">Cataclysm: Dark Days Ahead Launcher</p>
            <span className="text-sm text-muted-foreground">Active Profile: </span><Badge variant="outline">{currentProfile.name}</Badge>
            <p className="text-[10px] text-muted-foreground">Game Path: {currentProfile.gamePath}</p>
            <p className="text-[10px] text-muted-foreground">TODO: config version</p>

          </div>
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
                <ModsTable mods={data!}/>
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
