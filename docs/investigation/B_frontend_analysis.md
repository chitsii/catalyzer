# 領域B: フロントエンド現行調査

> **調査日**: 2026-01-27
> **調査者**: 足軽2号（シニアフロントエンドエンジニア）
> **ステータス**: 完了

---

## 1. ディレクトリ構造とコンポーネント一覧

### 1.1 全体構造

```
src/
├── app/                    # Next.js App Router
│   ├── assets/            # 静的アセット（フォント等）
│   ├── webviews/          # Tauri用Webview
│   ├── globals.css        # グローバルCSS
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # メインページ
│   └── favicon.ico
├── components/            # UIコンポーネント
│   ├── ui/               # shadcn/ui ベースコンポーネント（19個）
│   ├── datatable/        # データテーブル関連
│   │   └── mod-table/    # Mod一覧テーブル
│   ├── csr/              # CSR専用ラッパー
│   ├── progress-button/  # 進捗ボタン（ステートマシン付き）
│   ├── atoms.tsx         # Jotai atoms（状態管理の中心）
│   ├── profile-switcher.tsx  # プロファイル切替UI
│   ├── kani-menu.tsx     # 蟹メニュー（ゲーム起動等）
│   ├── command-palette.tsx   # コマンドパレット
│   └── ...その他
├── lib/                   # ユーティリティ
│   ├── api.ts            # Tauri API呼び出しラッパー
│   ├── invoke-safe.ts    # Tauri invoke安全ラッパー
│   ├── utils.ts          # 汎用ユーティリティ
│   └── types/            # 型定義
└── i18n/                  # 国際化
    └── config.ts         # i18next設定（ja/en）
```

### 1.2 コンポーネント一覧

| コンポーネント | ファイル | 役割 |
|--------------|---------|------|
| **Home** | `app/page.tsx` | メインページ、タブUI |
| **ProfileSwitcher** | `profile-switcher.tsx` | プロファイル切替ドロップダウン |
| **KaniMenu** | `kani-menu.tsx` | ロゴ兼メニュー（ゲーム起動） |
| **ModsTable** | `datatable/mod-table/table-mods.tsx` | Mod一覧表示 |
| **DataTable** | `datatable/mod-table/data-table.tsx` | TanStack Table実装 |
| **CommandPalette** | `command-palette.tsx` | コマンドパレット |
| **ColorThemeSelector** | `theme-seletor.tsx` | テーマ切替 |
| **LanguageSelector** | `language-selector.tsx` | 言語切替 |
| **AreaForLog** | `logger.tsx` | ログ表示エリア |

### 1.3 UIコンポーネント（shadcn/ui）

```
ui/
├── accordion.tsx    ├── badge.tsx       ├── button.tsx
├── card.tsx         ├── checkbox.tsx    ├── command.tsx
├── dialog.tsx       ├── dropdown-menu.tsx
├── form.tsx         ├── input.tsx       ├── label.tsx
├── progress.tsx     ├── scroll-area.tsx ├── select.tsx
├── sonner.tsx       ├── table.tsx       ├── tabs.tsx
├── textarea.tsx     └── toggle.tsx
```

---

## 2. Jotai atoms の使い方と状態管理パターン

### 2.1 atoms定義（`components/atoms.tsx`）

```typescript
// 設定リフレッシュ用カウンター
const refreshSettingState = atom(0);
const refreshSettingAtom = atom(
  (get) => get(refreshSettingState),
  (get, set) => set(refreshSettingState, (c) => c + 1)
);

// 設定データ（TanStack Query統合）
const settingAtom = atomWithSuspenseQuery((get) => ({
  queryKey: [get(refreshSettingState)],
  queryFn: async () => await getSettings(),
  staleTime: Infinity,
  refetchOnMount: "always",
}));

// アクティブプロファイル（派生atom）
const activeProfileAtom = atom(async (get) => {
  const { data: settings } = await get(settingAtom);
  return settings?.profiles.find((p) => p.is_active) ?? null;
});

// Mod一覧
const modsAtom = atomWithSuspenseQuery((get) => ({
  queryKey: ["mods", get(refreshState), get(activeProfileAtom)],
  queryFn: async () => await listMods(),
  staleTime: Infinity,
}));

// ログテキスト
const logTextAtom = atom<String[]>([]);
```

### 2.2 状態管理パターン

| パターン | 説明 | 使用箇所 |
|---------|------|---------|
| **リフレッシュカウンター** | カウンターを増加させてクエリを再実行 | `refreshSettingAtom`, `refreshModsAtom` |
| **派生atom** | 他のatomから計算される値 | `activeProfileAtom` |
| **Suspense統合** | `atomWithSuspenseQuery`でローディング状態を宣言的に処理 | `settingAtom`, `modsAtom` |
| **グローバルStore** | `createStore()`でストアを作成・エクスポート | `store` |

### 2.3 型定義

```typescript
type UserDataPaths = {
  root: string;
  mods: string;
  config: string;
  font: string;
  save: string;
  sound: string;
  gfx: string;
};

type Profile = {
  id: string;
  name: string;
  game_path: string;
  profile_path: UserDataPaths;
  mod_status: Mod[];
  is_active: boolean;
};

type Settings = {
  language: string;
  mod_data_path: string;
  profiles: Profile[];
};
```

---

## 3. TanStack Query の使い方

### 3.1 Jotai-TanStack Query統合

`jotai-tanstack-query`パッケージを使用し、atomとTanStack Queryを統合している。

```typescript
import { atomWithSuspenseQuery } from "jotai-tanstack-query";
```

### 3.2 キャッシュ戦略

| 設定 | 値 | 意味 |
|-----|---|------|
| `staleTime` | `Infinity` | データは常にフレッシュとみなす（自動再取得なし） |
| `refetchOnMount` | `"always"` | マウント時に必ず再取得 |
| `retry` | `10` | 失敗時10回リトライ（settingAtomのみ） |
| `retryDelay` | `500ms` | リトライ間隔 |

### 3.3 データ更新パターン

**手動リフレッシュ方式**を採用：

```typescript
// コンポーネント内
const [_, refresh] = useAtom(refreshModsAtom);

// データ更新後に明示的に呼び出し
table.options.meta?.fetchMods(); // = refresh()
```

### 3.4 ミューテーション

TanStack Queryのミューテーション機能は**未使用**。代わりに：

1. Tauri APIを直接呼び出し
2. 成功後にリフレッシュ関数を実行
3. 必要に応じてページリロード（`windowReload()`）

```typescript
// 例: プロファイル選択
const selectProfile = async (id: string) => {
  await setProfileActive(id);  // Tauri API
  await windowReload();        // ページリロード
};
```

---

## 4. コンポーネント間のデータフロー

### 4.1 データフロー図

```
┌─────────────────────────────────────────────────────────────┐
│                      Rust Backend (Tauri)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ invoke_safe()
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     lib/api.ts                               │
│  getSettings(), listMods(), launchGame(), etc.              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  components/atoms.tsx                        │
│  settingAtom, modsAtom, activeProfileAtom                   │
│  (Jotai + TanStack Query)                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ useAtom()
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Components                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  KaniMenu    │  │ProfileSwitcher│  │  ModsTable   │      │
│  │  (設定参照)  │  │  (設定参照)   │  │  (Mods参照)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 状態の流れ

1. **初期ロード**: `settingAtom` → Tauri API → Settings取得
2. **Mod一覧取得**: `activeProfileAtom`依存 → `modsAtom` → Mod一覧取得
3. **更新時**: API呼び出し → リフレッシュatom更新 → 再フェッチ

### 4.3 Propsドリリング

`DataTable`コンポーネントではTableMetaを通じて関数を渡している：

```typescript
meta: {
  fetchMods: fetchMods,  // リフレッシュ関数
  t: t,                  // i18n関数
}
```

---

## 5. Tauri APIとの通信パターン

### 5.1 invoke_safe ラッパー

```typescript
// lib/invoke-safe.ts
export async function invoke_safe<T>(cmd: string, args?: InvokeArgs): Promise<T> {
  if (isNode()) {
    return Promise.resolve(undefined as unknown as T);
  }
  const tauriAppsApi = await import("@tauri-apps/api/core");
  return tauriAppsApi.invoke(cmd, args);
}
```

**特徴**:
- SSR環境でのエラー回避（Node.js検出）
- 動的インポートで遅延ロード
- 型安全なジェネリック

### 5.2 API関数一覧（lib/api.ts）

| カテゴリ | 関数 | Tauriコマンド |
|---------|------|--------------|
| **ゲーム** | `launchGame()` | `launch_game` |
| **設定** | `getSettings()` | `get_settings` |
| **プロファイル** | `addProfile()`, `removeProfile()`, `editProfile()`, `setProfileActive()` | 各種 |
| **Git** | `gitCommand()`, `cloneModRepo()`, `listBranches()`, `gitFetch()` | 各種 |
| **Mod** | `listMods()`, `installMod()`, `uninstallMods()` | `scan_mods`等 |
| **CDDA** | `cddaStableReleases()`, `cddaLatestReleases()` | CDDA関連 |
| **ユーティリティ** | `openLocalDir()`, `unzipModArchive()`, `getPlatform()` | 各種 |

### 5.3 非同期パターン

全てのTauri呼び出しは**async/await**で統一：

```typescript
const launchGame = async () => await invoke_safe("launch_game", {});
```

---

## 6. 現行UIの課題点

### 6.1 VISION.md/UI_WIREFRAME.mdで指摘された課題

| 課題 | 詳細 | 深刻度 |
|------|------|--------|
| **状態が不明瞭** | ゲームバージョン非表示、Mod構成全体が見えない | 高 |
| **git概念の露出** | 「ブランチ」「コミット」がUIに表示 | 高 |
| **編集しづらい** | 3階層ドロップダウン、操作の分散 | 中 |
| **プロファイル概念が曖昧** | ゲームバージョンとMod構成の関係が不明確 | 高 |

### 6.2 コード分析から発見した課題

| 課題 | ファイル | 詳細 |
|------|---------|------|
| **ページリロード依存** | `utils.ts:44-50` | `windowReload()`で強制リロード、UX低下 |
| **Suspense未活用** | 各コンポーネント | ローディング状態が個別に`isLoading`で処理 |
| **エラーハンドリング不統一** | 全般 | API呼び出し後のエラー処理が不十分 |
| **i18n重複インポート** | 複数ファイル | `"@/i18n/config"`を毎回インポート |
| **型定義の分散** | `atoms.tsx`, `columns.tsx` | 同じ型が複数箇所で定義 |

### 6.3 columns.tsx の課題（特に深刻）

```typescript
// 問題1: コンポーネント内でuseState使用（Anti-pattern）
cell: ({ row, table }) => {
  const [branches, setBranches] = React.useState<string[]>([]);
  // ...
}

// 問題2: Git概念がUIに直接露出
<p>{table.options.meta?.t("mod_create_new_branch")}</p>
<p>{table.options.meta?.t("mod_branch_name")}</p>
```

---

## 7. 新アーキテクチャ移行時の影響範囲

### 7.1 変更が必要なコンポーネント

| コンポーネント | 変更内容 | 影響度 |
|--------------|---------|--------|
| **atoms.tsx** | `Profile`→`Snapshot`型変更、新atoms追加 | 高 |
| **profile-switcher.tsx** | スナップショットUIに完全置換 | 高 |
| **columns.tsx** | Git関連UI削除、シンプル化 | 高 |
| **data-table.tsx** | Mod一覧のシンプル化 | 中 |
| **kani-menu.tsx** | ヘッダーへ移動、状態表示追加 | 中 |
| **page.tsx** | レイアウト変更、タブ構成変更 | 高 |
| **api.ts** | スナップショット関連API追加 | 中 |
| **i18n/config.ts** | 新用語追加（スナップショット等） | 低 |

### 7.2 削除可能なコード

| 対象 | 理由 |
|------|------|
| `gitCommand()`, `listBranches()`, `gitFetch()` 等 | Git概念隠蔽 |
| `columns.tsx`のブランチ切替UI | Git概念隠蔽 |
| `mod_branch_name`, `mod_create_new_branch`等のi18nキー | 不要になる |

### 7.3 新規作成が必要なコンポーネント

| コンポーネント | 役割 |
|--------------|------|
| **SnapshotList** | スナップショット一覧画面 |
| **SnapshotCard** | 個別スナップショット表示 |
| **StatusHeader** | ヘッダー状態表示（常時表示） |
| **StorageIndicator** | 容量表示・警告 |
| **CleanupDialog** | クリーンアップダイアログ |

### 7.4 移行の優先順位（推奨）

1. **Phase 1**: 型定義変更（`Profile`→`Snapshot`）、atoms更新
2. **Phase 2**: ヘッダーUI改善、状態表示追加
3. **Phase 3**: スナップショット一覧画面実装
4. **Phase 4**: Git関連UI段階的削除
5. **Phase 5**: Mod一覧のシンプル化

---

## 8. 要検討事項

| 項目 | 内容 | 担当 |
|------|------|------|
| **Suspense境界の設計** | コンポーネント単位かページ単位か | 要決定 |
| **エラーバウンダリ** | グローバルか個別か | 要決定 |
| **TanStack Query Mutation導入** | 現在未使用、導入するか | 要検討 |
| **型定義の一元化** | `types/`ディレクトリに集約するか | 推奨 |
| **テスト戦略** | 現在テストなし、追加方針 | 要決定 |

---

## 9. 参照ドキュメント

- `/home/tishi/prj/catalyzer/docs/VISION.md`
- `/home/tishi/prj/catalyzer/docs/UI_WIREFRAME.md`

---

*調査完了: 2026-01-27*
