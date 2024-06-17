"use client";

// React
import Image from "next/image";
import Link from "next/link";

// Components
import { Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// State
import { useAtom } from "jotai";
import { settingAtom } from "@/components/atoms";

// Utils
import { launchGame } from "@/lib/api";

// i18n
import "@/i18n/config";
import { useTranslation } from "@/i18n/config";

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

export { KaniMenu };
