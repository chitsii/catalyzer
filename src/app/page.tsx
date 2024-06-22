"use client";

// React
import { useEffect, useState } from "react";
import path from "path";

// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorThemeSelector } from "@/components/theme-seletor";
import { ModsTable } from "@/components/datatable/mod-table/table-mods";
import CSR from "@/components/csr/csr";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { AreaForLog } from "@/components/logger";

// State
import { useAtom } from "jotai";
import { refreshModsAtom, modsAtom } from "@/components/atoms";

// Utils
import { ask } from "@tauri-apps/plugin-dialog";
import { popUp } from "@/lib/utils";
import { invoke_safe, unzipModArchive } from "@/lib/api";

// animation
import { AnimatePresence, motion } from "framer-motion";

// i18n
import "@/i18n/config";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation, i18n } from "@/i18n/config";

import { ProfileSwitcher } from "@/components/profile-switcher";
import { LanguageSetter } from "@/components/language-setter";
import { KaniMenu } from "@/components/kani-menu";

let IS_LOGGER_ATTACHED = false;

export default function Home() {
  const { t } = useTranslation();

  useEffect(() => {
    // ロガーがアタッチされていない場合はアタッチする
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
      <LanguageSetter />
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
