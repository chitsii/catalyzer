import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "en",
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
        game_path_not_set: "Gameパス未設定",

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
        mod_state: "導入",
        no_mods_found: "Modが見つかりませんでした",
        add_mods_to_data_directory: "ここをクリックして管理ディレクトリを開いてModを追加しましょう",
        its_okay_to_drop_zip_files_here: "単にzipファイルをドロップしても追加できます！",
        zip_file: "Zipファイル(任意。新しい断面のデータとして使用されます)",
        select_zip_file: "ファイルを選択",
        file_not_selected: "現在ファイルは選択されていません",
        created_by: "作成",
        maintained_by: "保守",
        branch_name_required: "ブランチ名が入力されていません！",

        // Profile
        create_profile: "プロファイルを作る",
        download_url_not_found: "ダウンロードURLが見つかりません",
        api_rate_limit_remaining: "APIコール制限残",
        version_may_be_building: "このバージョンはビルド中かもしれません。URLから確認してみてください。",
        download_or_extract_failed: "ダウンロードまたは解凍に失敗しました。",

        // Profile Switcher
        edit: "編集",
        add_by_selecting_game: "ゲームを選んで追加",
        press_esc_to_cancel: "Escで解除",
        add_manually: "手動追加",
        add_new: "新規追加",
        add_new_profile_description: "プロファイルを新規追加します。",
        update: "更新",
        no_items: "項目無し",
        update_profile_description: "プロファイルを更新します。",
        delete: "削除",
        delete_profile: "プロファイル削除",
        confirm_delete_profile: "本当に以下のプロファイルを削除しますか？",
        select_profile: "プロファイルを選択",

        // Theme Selector
        select_color_theme: "カラーテーマを選択する",
        selected: "選択中",

        // Command Palette
        clone: "クローン",
        what_would_you_like: "ナニニシマスカ?",
        mod_operations: "Mod操作",
        mod_creation_helper: "Mod作成ヘルパー",

        // Input Card
        change: "変更",
        save: "保存",

        // Drag & Drop
        confirm_extract_zip: "ZipファイルをModディレクトリに解凍しますか？",
        unsupported_file_format: "サポートしていないファイル形式です。",
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
        game_path_not_set: "Game path not set",

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
        file_not_selected: "Currently no file selected.",
        created_by: "Created by",
        maintained_by: "Maintained by",
        branch_name_required: "Branch name is required!",

        // Profile
        create_profile: "Create Profile",
        download_url_not_found: "Download URL not found",
        api_rate_limit_remaining: "API Rate Limit Remaining",
        version_may_be_building: "This version may be building. Please check the URL.",
        download_or_extract_failed: "Download or extraction failed.",

        // Profile Switcher
        edit: "Edit",
        add_by_selecting_game: "Add by selecting game",
        press_esc_to_cancel: "Press Esc to cancel",
        add_manually: "Add manually",
        add_new: "Add New",
        add_new_profile_description: "Add a new profile.",
        update: "Update",
        no_items: "No items",
        update_profile_description: "Update the profile.",
        delete: "Delete",
        delete_profile: "Delete Profile",
        confirm_delete_profile: "Are you sure you want to delete the following profile?",
        select_profile: "Select Profile",

        // Theme Selector
        select_color_theme: "Select color theme",
        selected: "Selected",

        // Command Palette
        clone: "Clone",
        what_would_you_like: "What would you like?",
        mod_operations: "Mod Operations",
        mod_creation_helper: "Mod Creation Helper",

        // Input Card
        change: "Change",
        save: "Save",

        // Drag & Drop
        confirm_extract_zip: "Extract zip file to Mod directory?",
        unsupported_file_format: "Unsupported file format.",
      },
    },
  },
});

export { i18n, useTranslation };
