"use client";

import { useEffect, useState, useRef, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import path from "path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckIcon, PencilIcon, Trash2Icon, Edit3, LucideExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorThemeSelector } from "@/components/theme-seletor";
import { ModsTable } from "@/components/datatable/mod-table/table-mods";
import CSR from "@/components/csr/csr";
import { useAtom } from "jotai";
import { refreshModsAtom, modsAtom, settingAtom, Profile, refreshSettingAtom } from "@/components/atoms";
import { ask } from "@tauri-apps/api/dialog";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { popUp } from "@/lib/utils";
import { addProfile, setProfileActive, removeProfile, editProfile, unzipModArchive, launchGame } from "@/lib/api";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AreaForLog } from "@/components/logger";

const profileFormSchema = z.object({
  name: z.string().min(1).max(30).trim(),
  game_path: z
    .string()
    .max(255)
    .trim()
    .refine((value) => {
      return value.endsWith("cataclysm-tiles.exe" || "Cataclysm.app");
    }, "Game path must end with cataclysm-tiles.exe or Cataclysm.app"),
});

type ProfileFormProps = {
  targetProfile?: Profile;
  handleDialogItemOpenChange: (open: boolean) => void;
};
const ProfileForm = ({ targetProfile, handleDialogItemOpenChange }: ProfileFormProps) => {
  const [_, refresh] = useAtom(refreshSettingAtom);

  const defaultValues = targetProfile
    ? {
        name: targetProfile.name,
        game_path: targetProfile.game_path || "",
      }
    : {
        name: "",
        game_path: "",
      };

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: defaultValues,
  });

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    const handleAddProfile = async (name: string, gamePath: string) => {
      await addProfile(name, gamePath);
      form.reset();
      refresh();
    };

    const handleEditProfile = async (id: string, name: string, gamePath: string) => {
      await editProfile(id, name, gamePath);
      form.reset();
      refresh();
    };

    targetProfile
      ? await handleEditProfile(targetProfile.id, values.name, values.game_path)
      : await handleAddProfile(values.name, values.game_path);

    refresh(); // refresh settings
    handleDialogItemOpenChange(false); // close dialog
  };

  const InputField = ({ name, title }: { name: "name" | "game_path"; title: string }) => {
    return (
      <FormField
        name={name}
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">{title}</FormLabel>
            <FormControl>
              <Input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        {InputField({ name: "name", title: "プロファイル名" })}
        {InputField({ name: "game_path", title: "Gameパス" })}
        <Button
          type="submit"
          onClick={async () => {
            const isValid = await form.trigger();
            if (!isValid) return;
          }}
        >
          Submit
        </Button>
      </form>
    </Form>
  );
};

type DialogItemProps = {
  triggerChildren: ReactNode;
  children: ReactNode;
  onSelect: () => void;
  onOpenChange: (open: boolean) => void;
};
const DialogItem = ({ triggerChildren, children, onSelect, onOpenChange }: DialogItemProps) => {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onSelect && onSelect();
          }}
        >
          {triggerChildren}
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};

const ProfileSwitcher = () => {
  const [{ data: settings }] = useAtom(settingAtom);
  const [_, refresh] = useAtom(refreshSettingAtom);
  const profileList = settings ? settings.profiles : [];

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasOpenDialog, setHasOpenDialog] = useState(false);
  const dropdownTriggerRef = useRef<null | HTMLButtonElement>(null);
  const focusRef = useRef<null | HTMLButtonElement>(null);

  const handleDialogItemSelect = () => {
    focusRef.current = dropdownTriggerRef.current;
  };
  const handleDialogItemOpenChange = (open: boolean) => {
    setHasOpenDialog(open);
    if (open === false) {
      setDropdownOpen(false);
    }
  };

  const selectProfile = async (id: string) => {
    await setProfileActive(id);
    // refresh();
    // FIXME: junky way to update client side
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    await sleep(400).then(() => {
      window.location.reload();
    });
  };

  const currentProfile = profileList.find((p) => p.is_active);

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={(isOpen) => setDropdownOpen(isOpen)}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" ref={dropdownTriggerRef}>
            <Badge className="text-primary-foreground hover:mouse-pointer hover:bg-primary cursor-pointer hover:skew-x-12 hover:scale=[1.1] hover:rotate-[-12deg] transition-transform duration-300 ease-in-out">
              {currentProfile ? currentProfile.name : "No Profile"}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          hidden={hasOpenDialog}
          onCloseAutoFocus={(event) => {
            if (focusRef.current) {
              focusRef.current.focus();
              focusRef.current = null;
              event.preventDefault();
            }
          }}
        >
          <DropdownMenuLabel>プロファイルを選択</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {profileList.length === 0 ? (
            <DropdownMenuItem>
              <span className="text-secondary">No Profiles</span>
            </DropdownMenuItem>
          ) : (
            profileList.map((profile: any) => {
              return (
                <DropdownMenuItem
                  key={profile.id}
                  onClick={async (e) => {
                    e.preventDefault();
                    await selectProfile(profile.id);
                  }}
                  className="flex items-center px-3 text-sm text-primary grid-cols-2"
                >
                  {profile.is_active ? (
                    <CheckIcon className="mx-4 h-4 w-4 col-span-1" />
                  ) : (
                    <div className="col-span-1"></div>
                  )}
                  <span className="col-span-1">{profile.name}</span>
                </DropdownMenuItem>
              );
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>編集</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DialogItem
                triggerChildren={
                  <>
                    <LucideExternalLink className="mr-4 h-4 w-4" />
                    <span>新規追加</span>
                  </>
                }
                onSelect={handleDialogItemSelect}
                onOpenChange={handleDialogItemOpenChange}
              >
                <DialogTitle className="DialogTitle">新規追加</DialogTitle>
                <DialogDescription className="DialogDescription">プロファイルを新規追加します。</DialogDescription>
                <ProfileForm handleDialogItemOpenChange={handleDialogItemOpenChange} />
              </DialogItem>
              <DropdownMenuSeparator />
              {/* プロファイル更新 ==== */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <>
                    <Edit3 className="mr-4 h-4 w-4" />
                    <span>更新</span>
                  </>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {profileList.filter((profile) => profile.id !== "default").length === 0 ? (
                    <DropdownMenuItem>
                      <span className="text-muted-foreground">項目無し</span>
                    </DropdownMenuItem>
                  ) : (
                    profileList.map((profile) => {
                      // default profile is not editable.
                      if (profile.id === "default") return null;

                      return (
                        <DialogItem
                          key={profile.id}
                          triggerChildren={
                            <>
                              <PencilIcon className="mr-4 h-4 w-4" />
                              <span>{profile.name}</span>
                            </>
                          }
                          onSelect={handleDialogItemSelect}
                          onOpenChange={handleDialogItemOpenChange}
                        >
                          <DialogTitle className="DialogTitle">Add</DialogTitle>
                          <DialogDescription className="DialogDescription">
                            プロファイルを更新します。
                          </DialogDescription>
                          <ProfileForm
                            handleDialogItemOpenChange={handleDialogItemOpenChange}
                            targetProfile={profile}
                          />
                        </DialogItem>
                      );
                    })
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {/* === */}

              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <>
                    <Trash2Icon className="mr-4 h-4 w-4 text-destructive" />
                    <span className="text-destructive">削除</span>
                  </>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {profileList.filter((profile) => profile.id !== "default").length === 0 ? (
                    <DropdownMenuItem>
                      <span className="text-muted-foreground">項目無し</span>
                    </DropdownMenuItem>
                  ) : (
                    profileList.map((profile: any) => {
                      // default profile is not removable.
                      if (profile.id === "default") return null;

                      return (
                        <DialogItem
                          key={profile.id}
                          triggerChildren={
                            <>
                              <Trash2Icon className="mr-4 h-4 w-4" />
                              <span>{profile.name}</span>
                            </>
                          }
                          onSelect={() => {}}
                          onOpenChange={handleDialogItemOpenChange}
                        >
                          <DialogTitle className="DialogTitle">プロファイル削除</DialogTitle>
                          <DialogDescription>
                            <p>本当に以下のプロファイルを削除しますか？</p>
                            <div className="p-4">
                              <ul className="list-disc">
                                <li className="text-destructive text-xs">Name: {profile.name}</li>
                                <li className="text-destructive text-xs">Game Path: {profile.game_path}</li>
                                <li className="text-destructive text-xs">
                                  Active: {JSON.stringify(!!profile.is_active)}
                                </li>
                                <li className="text-destructive text-xs">(Unique ID: {profile.id})</li>
                              </ul>
                            </div>
                          </DialogDescription>
                          <Button
                            onClick={async () => {
                              removeProfile(profile.id);
                              // refresh settings
                              refresh();
                              // close dialog
                              handleDialogItemOpenChange(false);
                            }}
                          >
                            Remove
                          </Button>
                        </DialogItem>
                      );
                    })
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

const GlobalMenu = () => {
  const [{ data: setting }] = useAtom(settingAtom);
  const current_profile = setting ? setting.profiles.find((p) => p.is_active) : null;
  const game_path = current_profile ? current_profile.game_path : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="rounded-2xl hover:shadow-lg hover:shadow-accent-foreground">
          <Image src="/assets/icon.png" alt="menu" width={80} height={80} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          {
            // ゲーム起動; ゲームパスがない場合は無効化
            !!game_path ? (
              <DropdownMenuItem className="text-lg" onClick={() => launchGame()}>
                <Play className="mr-4 h-4 w-4" />
                ゲーム起動
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem>
                <div
                  className="text-lg text-gray-500 cursor-not-allowed pointer-events-none flex items-center
                  "
                >
                  <Play className="mr-4 h-4 w-4" />
                  Gameパス未設定
                </div>
              </DropdownMenuItem>
            )
          }
          <DropdownMenuSeparator />
          <DropdownMenuLabel>
            <p className="text-xs">👇ブラウザで開く</p>
          </DropdownMenuLabel>
          <DropdownMenuItem>
            <Link href="https://github.com/CleverRaven/Cataclysm-DDA/" target="_blank" rel="noopener noreferrer">
              リポジトリ (GitHub)
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

let IS_LOGGER_ATTACHED = false;

export default function Home() {
  useEffect(() => {
    const setUpDropEvent = async () => {
      const window = await import("@tauri-apps/api/window");
      const { appWindow } = window;
      appWindow.onFileDropEvent(async (ev) => {
        if (ev.payload.type !== "drop") return;
        const does_install = await ask("ドロップしたファイルをModディレクトリに解凍しますか？", "Catalyzer");
        if (!does_install) return;
        const [filepath] = ev.payload.paths;
        if (path.extname(filepath) === ".zip") {
          unzipModArchive(filepath);
          return;
        } else {
          popUp("failed", "サポートしていないファイル形式です。");
        }
      });
    };

    const setUpDropEventAndAttachLogger = async () => {
      if (!IS_LOGGER_ATTACHED) {
        await setUpDropEvent();
        IS_LOGGER_ATTACHED = true;
      }
    };

    setUpDropEventAndAttachLogger();
  }, []);

  const [{ data: mods }] = useAtom(modsAtom);
  const [_, refresh] = useAtom(refreshModsAtom);

  return (
    <main>
      <div className="w-full overflow-hidden select-none bg-muted/40">
        <div className="flex w-full h-[100px] gap-8 p-4 items-center">
          <div className="flex-shrink-0 w-[100px] h-[100px] rounded-lg flex items-center justify-center">
            <GlobalMenu />
          </div>
          <div className="flex-grow">
            <CSR>
              <p className="text-xl font-semibold">Catalyzer</p>
              <span className="text-sm text-muted-foreground">現在のプリセット:</span>
              <ProfileSwitcher />
            </CSR>
          </div>
        </div>
        <div className="w-full">
          <Tabs defaultValue="mods" className="w-full h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger
                value="mods"
                onClick={() => {
                  refresh();
                }}
              >
                Mod一覧({mods?.length})
              </TabsTrigger>
              <TabsTrigger value="setting">設定</TabsTrigger>
              <TabsTrigger value="debug">ログ</TabsTrigger>
            </TabsList>
            <TabsContent value="mods">
              <div className="bg-muted/40">
                <ModsTable mods={mods!} />
              </div>
            </TabsContent>
            <TabsContent value="setting">
              <div className="flex min-h-[calc(97vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="mx-auto grid w-full max-w-6xl gap-2">
                  <h1 className="text-3xl font-semibold">設定</h1>
                </div>
                <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
                  <nav className="grid gap-4 text-sm text-muted-foreground" x-chunk="dashboard-04-chunk-0">
                    <Link href="#theme_setting" className="font-semibold text-primary">
                      カラーテーマ
                    </Link>
                    {/* <Link href="#language_setting"
                      className="font-semibold text-primary">
                      言語
                    </Link> */}
                  </nav>
                  <ScrollArea>
                    <Card id="theme_setting" className="border-none">
                      <CardHeader>
                        <CardTitle>カラーテーマ</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ColorThemeSelector />
                      </CardContent>
                    </Card>
                    {/* <Card id="theme_setting" className="border-none">
                      <CardHeader>
                        <CardTitle>言語</CardTitle>
                      </CardHeader>
                      <CardContent>
                        TODO
                      </CardContent>
                    </Card> */}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="debug">
              <AreaForLog />
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
    </main>
  );
}
