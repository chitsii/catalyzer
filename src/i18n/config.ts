import { useParams } from "next/navigation";

import i18n from "i18next";
import { initReactI18next, useTranslation as useTranslationOrg } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    lng: undefined,
    fallbackLng: "en",
    // detection: {
    //   order: ["path", "htmlTag", "cookie", "navigator"],
    // },
    // debug: true,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      ja: {
        translation: {
          // Home
          current_profile: "現在のプロファイル",
          top_info_game_path: "ゲームPath",
          top_info_user_file: "ユーザファイル",
          mods: "Mod一覧",
          settings: "設定",
          logs: "ログ",
          color_theme: "カラーテーマ",
          language: "言語",
          profile_name: "プロファイル名",
          game_path: "Gameパス",
          userfile: "ユーザファイル",

          // 蟹Menu
          launch_game: "ゲーム起動",
          open_in_browser: "ブラウザで開く",
          repository: "リポジトリ",
          hitchhikers_guide: "Hitchhiker's Guide to the Cataclysm",

          // ModTable
          mod_name: "名称",
          mod_author: "作者",
          mod_version: "データ断面",
          mod_start_versioning: "バージョン管理を始める",
          mod_branch_name: "ブランチ名",
          mod_create_new_branch: "新規断面を作成",
          mod_there_is_no_switchable_branch: "切り替え可能な断面がありません",
          mod_switch_to: "切り替え先...",
          mod_versin_switch: "バージョン切替",
          mod_description: "詳細説明",
          mod_state: "導入状態",
          no_mods_found: "Modが見つかりませんでした",
          add_mods_to_data_directory: "ここをクリックして管理ディレクトリを開いてModを追加しましょう",
          its_okay_to_drop_zip_files_here: "単にzipファイルをドロップしても追加できます！",
          zip_file: "Zipファイル(任意。新しい断面のデータとして使用されます)",
          select_zip_file: "ファイルを選択",
          file_not_selected: "現在ファイルは選択されていません",
        },
      },
      en: {
        translation: {
          // Home
          current_profile: "Current Profile",
          top_info_game_path: "Game Path",
          top_info_user_file: "User File",
          mods: "Mods",
          settings: "Settings",
          logs: "Logs",
          color_theme: "Color Theme",
          language: "Language",
          profile_name: "Profile Name",
          game_path: "Game Path",
          userfile: "User File",

          // 蟹Menu
          launch_game: "Launch Game",
          open_in_browser: "Open in Browser",
          repository: "Repository",
          hitchhikers_guide: "Hitchhiker's Guide to the Cataclysm",

          // ModTable
          mod_name: "Name",
          mod_author: "Author",
          mod_version: "Version",
          mod_start_versioning: "Start versioning",
          mod_branch_name: "Branch name",
          mod_create_new_branch: "Create new branch",
          mod_there_is_no_switchable_branch: "There is no switchable branch",
          mod_switch_to: "Switch to...",
          mod_versin_switch: "Version switch",
          mod_description: "Description",
          mod_state: "State",
          no_mods_found: "Empty.",
          add_mods_to_data_directory: "Click to Open Mod Directory to add some.",
          its_okay_to_drop_zip_files_here: "Or, you can just dropping zip files here!",
          zip_file: "Zip File. (Optional. This will be data for the new branch.)",
          select_zip_file: "Select File",
          file_not_selected: "Curretly no file selected.",
        },
      },
    },
  });

const runsOnServerSide = typeof window === "undefined";

function useTranslation() {
  const lang = useParams();
  const ret = useTranslationOrg();
  const { i18n } = ret;
  if (runsOnServerSide && i18n.resolvedLanguage !== lang.lng) {
    const arg = lang.lng ? lang.lng.toString() : "en";
    i18n.changeLanguage(arg);
  }
  return ret;
}

export { i18n, useTranslation };
