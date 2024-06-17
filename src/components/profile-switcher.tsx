"use client";

// React
import { useState, useRef, ReactNode } from "react";
import path from "path";

// Components
import { Badge } from "@/components/ui/badge";
import { CheckIcon, PencilIcon, Trash2Icon, Edit3, LucideExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// import { BgAnimateButton } from "@/components/bg-animate-button";

// State
import { useAtom } from "jotai";
import { settingAtom, refreshSettingAtom } from "@/components/atoms";

// Utils
import { windowReload } from "@/lib/utils";
import { setProfileActive, removeProfile, openLocalDir } from "@/lib/api";

// i18n
import "@/i18n/config";
import { useTranslation } from "@/i18n/config";

import { ProfileForm } from "@/components/profile-form";

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
                                isUpdate={true}
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
                <span
                  className="cursor-pointer line-clamp-2 bg-accent text-accent-foreground hover:underline"
                  onClick={() => {
                    openLocalDir(path.parse(currentProfile.game_path).dir);
                  }}
                >
                  {currentProfile.game_path}
                </span>
              </p>
            ) : null}
            {!!currentProfile.profile_path.root ? (
              <p>
                {/* ユーザファイル */}
                {t("userfile")}:
                <span
                  className="cursor-pointer line-clamp-2 bg-accent text-accent-foreground hover:underline"
                  onClick={() => {
                    openLocalDir(currentProfile.profile_path.root);
                  }}
                >
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

export { ProfileSwitcher };
