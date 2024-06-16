"use client";

// React
import { useEffect, useState, useRef, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import path from "path";

// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckIcon, PencilIcon, Trash2Icon, Edit3, LucideExternalLink, Play, Languages } from "lucide-react";
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
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { AreaForLog } from "@/components/logger";

// State
import { useAtom } from "jotai";
import { refreshModsAtom, modsAtom, settingAtom, Profile, refreshSettingAtom } from "@/components/atoms";

// Utils
import { ask } from "@tauri-apps/plugin-dialog";
import { popUp, windowReload } from "@/lib/utils";
import { addProfile, setProfileActive, removeProfile, editProfile, unzipModArchive, launchGame } from "@/lib/api";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// animation
import { AnimatePresence, motion } from "framer-motion";

// i18n
import "@/i18n/config";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation } from "@/i18n/config";

const profileFormSchema = z.object({
  name: z.string().min(1).max(20).trim(),
  game_path: z
    .string()
    .max(255)
    .trim()
    .refine((value) => {
      return value.endsWith("cataclysm-tiles.exe") || value.endsWith("Cataclysm.app");
    }, "Game path must end with cataclysm-tiles.exe or Cataclysm.app"),
});

type ProfileFormProps = {
  targetProfile?: Profile;
  handleDialogItemOpenChange: (open: boolean) => void;
};
const ProfileForm = ({ targetProfile, handleDialogItemOpenChange }: ProfileFormProps) => {
  const { t } = useTranslation();

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
        {InputField({ name: "name", title: t("profile_name") })}
        {InputField({ name: "game_path", title: t("game_path") })}
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
  const { t } = useTranslation();

  const [{ data: settings, isLoading, error }] = useAtom(settingAtom);
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

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
    await windowReload();
  };

  const currentProfile = profileList.find((p) => p.is_active);
  return (
    <div className="flex w-full">
      <div className="w-1/3 mb-2">
        <p className="text-xl font-semibold">Catalyzer</p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* 現在のプリセット: */}
          {t("current_profile")}:
        </p>
        <>
          <DropdownMenu open={dropdownOpen} onOpenChange={(isOpen) => setDropdownOpen(isOpen)}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hover:bg-primary-background" ref={dropdownTriggerRef}>
                <Badge
                  className="w-24
                  bg-gradient-to-r from-orange-500 to-purple-500 text-white rounded-full
                  hover:from-blue-600 hover:to-purple-600 hover:text-yellow-300
                  break-all whitespace-normal line-clamp-3"
                >
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
                  {/* プロファイル更新 */}
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
                  {/* プロファイル削除 */}
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
      </div>
      <div className="w-2/3 text-xs text-muted-foreground break-all">
        {currentProfile ? (
          <div>
            {!!currentProfile.game_path ? (
              <p>
                {/* Gameパス */}
                {t("game_path")}:
                <span className="line-clamp-2 bg-accent text-accent-foreground">{currentProfile.game_path}</span>
              </p>
            ) : null}
            {!!currentProfile.profile_path.root ? (
              <p>
                {/* ユーザファイル */}
                {t("userfile")}:
                <span className="line-clamp-2 bg-accent text-accent-foreground">
                  {currentProfile.profile_path.root}
                </span>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No Profile</p>
        )}
      </div>
    </div>
  );
};

const KaniMenu = () => {
  const { t } = useTranslation();
  const [{ data: setting, isLoading, error }] = useAtom(settingAtom);
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const current_profile = setting ? setting.profiles.find((p) => p.is_active) : null;
  const game_path = current_profile ? current_profile.game_path : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="rounded-2xl cursor-pointer hover:scale-110 duration-300 transition-transform">
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
                  {/* ゲーム起動 */}
                  {t("launch_game")}
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
              <p className="text-xs">
                🌐
                {/* ブラウザで開く */}
                {t("open_in_browser")}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuItem>
              <Link href="https://github.com/CleverRaven/Cataclysm-DDA/" target="_blank" rel="noopener noreferrer">
                {/* Repository */}
                {t("repository")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="https://cdda-guide.nornagon.net" target="_blank" rel="noopener noreferrer">
                {/* Hitchhikers Guide */}
                {t("hitchhikers_guide")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

let IS_LOGGER_ATTACHED = false;

export default function Home() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const setUpDropEvent = async () => {
      const { getCurrent } = await import("@tauri-apps/api/webviewWindow");
      const unlisten = await getCurrent().onDragDropEvent(async (ev) => {
        if (ev.payload.type === "dropped") {
          const does_install = await ask(
            `ZipファイルをModディレクトリに解凍しますか？\n${ev.payload.paths}`,
            "Catalyzer",
          );
          if (!does_install) return;
          const [filepath] = ev.payload.paths;
          if (path.extname(filepath) === ".zip") {
            unzipModArchive(filepath);
            return;
          } else {
            popUp("failed", "サポートしていないファイル形式です。");
          }
        } else {
          return;
        }
      });

      return () => {
        unlisten();
      };
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
    <main
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0 }}
          className="w-full overflow-hidden select-none bg-muted/40"
        >
          <CSR>
            <div className="flex w-full h-[100px] gap-8 p-4 items-center">
              <div className="flex-shrink-0 w-[100px] h-[100px] rounded-lg flex items-center justify-center">
                <motion.div
                  whileHover={{
                    scale: [1.0, 1.1, 1.0, 1.1, 1.0],
                    borderRadius: ["100%", "90%", "80%", "90%", "100%"],
                  }}
                  transition={{
                    duration: 3.0,
                    repeat: Infinity,
                    repeatDelay: 0,
                  }}
                >
                  <KaniMenu />
                </motion.div>
              </div>
              <ProfileSwitcher />
            </div>
          </CSR>
          <div className="w-full">
            <Tabs defaultValue="mods" className="w-full h-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="mods" onClick={() => refresh()}>
                  {/* Mod一覧 */}
                  {t("mods")}
                </TabsTrigger>
                <TabsTrigger value="setting">{t("settings")}</TabsTrigger>
                <TabsTrigger value="debug">
                  {/* ログ */}
                  {t("logs")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="mods">
                <div className="bg-muted/40">
                  <ModsTable mods={mods!} />
                </div>
              </TabsContent>
              <TabsContent value="setting">
                <div className="flex min-h-[calc(97vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                  <div className="mx-auto grid w-full max-w-6xl gap-2">
                    <h1 className="text-xl font-semibold">
                      {/* 設定 */}
                      {t("settings")}
                    </h1>
                  </div>
                  <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
                    <ScrollArea>
                      <Card id="theme_setting" className="border-none">
                        <CardHeader>
                          <CardTitle>
                            {/* カラーテーマ */}
                            {t("color_theme")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ColorThemeSelector />
                        </CardContent>
                      </Card>
                      <Card id="language_setting" className="border-none">
                        <CardHeader>
                          <CardTitle>
                            {/* 言語 */}
                            {t("language")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <LanguageSelector i18n={i18n} />
                        </CardContent>
                      </Card>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="debug">
                <AreaForLog />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
