# E. UI/UXコンポーネント設計書

> **作成者**: 足軽5号（シニアUIエンジニア）
> **作成日**: 2026-01-27
> **ステータス**: 調査完了

---

## 1. コンポーネントツリー設計

### 1.1 ページ構成

```
App
├── MainLayout                    # メインレイアウト（共通ヘッダー/フッター）
│   ├── Header                    # 現在の状態表示 + ゲーム起動
│   ├── TabNavigation             # タブ切替
│   ├── MainContent               # タブに応じたコンテンツ
│   │   ├── SnapshotPage          # スナップショット一覧
│   │   ├── ModListPage           # Mod一覧
│   │   └── SettingsPage          # 設定
│   └── Footer                    # アクションバー（必要に応じて）
└── DialogProvider                # グローバルダイアログ管理
    ├── ConfirmDialog             # 確認ダイアログ
    ├── CapacityWarningDialog     # 容量警告ダイアログ
    └── ToastNotification         # 通知トースト
```

### 1.2 コンポーネント階層（詳細）

```
src/components/
├── layout/
│   ├── MainLayout.tsx
│   ├── Header/
│   │   ├── Header.tsx
│   │   ├── CurrentStatus.tsx        # 現在の状態表示
│   │   ├── StatusIndicator.tsx      # 保存状態インジケータ
│   │   └── LaunchButton.tsx         # ゲーム起動ボタン
│   ├── TabNavigation/
│   │   ├── TabNavigation.tsx
│   │   └── TabButton.tsx
│   └── Footer.tsx
│
├── pages/
│   ├── SnapshotPage/
│   │   ├── SnapshotPage.tsx
│   │   ├── SnapshotList.tsx
│   │   ├── SnapshotCard.tsx
│   │   ├── SnapshotActions.tsx      # 切替/複製/編集/削除ボタン
│   │   ├── SnapshotCreateButton.tsx
│   │   └── StorageInfo.tsx          # 容量情報
│   │
│   ├── ModListPage/
│   │   ├── ModListPage.tsx
│   │   ├── ModTable.tsx
│   │   ├── ModRow.tsx
│   │   ├── ModToggle.tsx            # 有効/無効切替
│   │   ├── ModSearch.tsx
│   │   └── ModActions.tsx           # 追加/更新ボタン
│   │
│   └── SettingsPage/
│       ├── SettingsPage.tsx
│       ├── ThemeSelector.tsx
│       ├── LanguageSelector.tsx
│       ├── GameVersionManager.tsx
│       └── StorageManager.tsx
│
├── dialogs/
│   ├── DialogProvider.tsx
│   ├── ConfirmDialog.tsx
│   ├── CapacityWarningDialog.tsx
│   ├── SnapshotCreateDialog.tsx
│   ├── SnapshotEditDialog.tsx
│   └── ModAddDialog.tsx
│
├── common/
│   ├── Button.tsx
│   ├── IconButton.tsx
│   ├── Checkbox.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Badge.tsx
│   ├── ProgressBar.tsx
│   ├── Spinner.tsx
│   └── Toast.tsx
│
└── icons/
    └── index.tsx                    # アイコンコンポーネント集約
```

---

## 2. 各コンポーネントの詳細設計

### 2.1 Header

```typescript
// src/components/layout/Header/Header.tsx

interface HeaderProps {
  className?: string;
}

// 内部状態: なし（状態はグローバルから取得）
// イベントハンドラ: なし（子コンポーネントに委譲）
```

### 2.2 CurrentStatus

```typescript
// src/components/layout/Header/CurrentStatus.tsx

interface CurrentStatusProps {
  gameVersion: GameVersion | null;
  snapshotName: string | null;
  modCount: number;
  hasUnsavedChanges: boolean;
}

interface GameVersion {
  type: 'stable' | 'experimental';
  version: string;         // e.g., "0.I", "2026-01-25"
}

// 内部状態: なし
// イベントハンドラ: なし（表示専用）
```

### 2.3 StatusIndicator

```typescript
// src/components/layout/Header/StatusIndicator.tsx

interface StatusIndicatorProps {
  status: 'saved' | 'unsaved' | 'warning';
  label?: string;
}

// 色マッピング:
// - saved: 緑 (#22c55e)
// - unsaved: 黄 (#eab308)
// - warning: 赤 (#ef4444)
```

### 2.4 LaunchButton

```typescript
// src/components/layout/Header/LaunchButton.tsx

interface LaunchButtonProps {
  disabled?: boolean;
  isLaunching?: boolean;
  onLaunch: () => void;
}

// 内部状態:
// - isHovered: boolean（ホバー状態）

// イベントハンドラ:
// - onClick: ゲーム起動処理をトリガー
```

### 2.5 TabNavigation

```typescript
// src/components/layout/TabNavigation/TabNavigation.tsx

type TabId = 'snapshots' | 'mods' | 'settings';

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

interface TabConfig {
  id: TabId;
  label: string;
  icon: ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'snapshots', label: 'スナップショット', icon: <CameraIcon /> },
  { id: 'mods', label: 'Mod一覧', icon: <PackageIcon /> },
  { id: 'settings', label: '設定', icon: <SettingsIcon /> },
];
```

### 2.6 SnapshotCard

```typescript
// src/components/pages/SnapshotPage/SnapshotCard.tsx

interface Snapshot {
  id: string;
  name: string;
  gameVersion: GameVersion;
  modCount: number;
  createdAt: string;        // ISO 8601
  sizeBytes: number;
  isActive: boolean;
}

interface SnapshotCardProps {
  snapshot: Snapshot;
  onSwitch: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// 内部状態:
// - isExpanded: boolean（モバイル時の詳細展開）

// イベントハンドラ:
// - handleSwitch: 切替確認ダイアログを表示
// - handleDuplicate: 複製ダイアログを表示
// - handleEdit: 編集ダイアログを表示
// - handleDelete: 削除確認ダイアログを表示
```

### 2.7 ModRow

```typescript
// src/components/pages/ModListPage/ModRow.tsx

interface Mod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  version?: string;
  author?: string;
}

interface ModRowProps {
  mod: Mod;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

// 内部状態: なし

// イベントハンドラ:
// - handleToggle: 有効/無効を切り替え
// - handleDelete: 削除確認後に削除
```

### 2.8 StorageInfo

```typescript
// src/components/pages/SnapshotPage/StorageInfo.tsx

interface StorageInfoProps {
  usedBytes: number;
  snapshotCount: number;
  onCleanup: () => void;
}

// ヘルパー関数:
// - formatBytes(bytes: number): string  // "1.2 GB"形式
```

### 2.9 ConfirmDialog

```typescript
// src/components/dialogs/ConfirmDialog.tsx

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;     // default: "はい"
  cancelLabel?: string;      // default: "キャンセル"
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

// 内部状態:
// - isProcessing: boolean（確認ボタン押下後の処理中）
```

### 2.10 CapacityWarningDialog

```typescript
// src/components/dialogs/CapacityWarningDialog.tsx

interface CapacityWarningDialogProps {
  open: boolean;
  currentUsageBytes: number;
  snapshots: Snapshot[];
  onDelete: (ids: string[]) => void;
  onContinue: () => void;
  onCancel: () => void;
}

// 内部状態:
// - selectedIds: Set<string>（削除対象として選択されたID）

// 計算値:
// - selectedTotalBytes: 選択された項目の合計容量
```

---

## 3. 状態管理設計（Jotai）

### 3.1 Atoms 設計

```typescript
// src/store/atoms.ts

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// ===== グローバル状態（アプリ全体で共有） =====

/** 現在アクティブなスナップショットID */
export const activeSnapshotIdAtom = atom<string | null>(null);

/** 現在のタブ */
export const activeTabAtom = atom<TabId>('snapshots');

/** 未保存の変更があるか */
export const hasUnsavedChangesAtom = atom<boolean>(false);

/** アプリ設定（永続化） */
export const settingsAtom = atomWithStorage<AppSettings>('catalyzer-settings', {
  theme: 'system',
  language: 'ja',
});

interface AppSettings {
  theme: 'light' | 'dark' | 'system' | 'sepia';
  language: 'ja' | 'en';
}

// ===== 派生Atom（計算値） =====

/** 現在のスナップショット情報（派生） */
export const currentSnapshotAtom = atom((get) => {
  const activeId = get(activeSnapshotIdAtom);
  const snapshots = get(snapshotsAtom);
  return snapshots.find(s => s.id === activeId) ?? null;
});

/** ストレージ使用量（派生） */
export const storageUsageAtom = atom((get) => {
  const snapshots = get(snapshotsAtom);
  return {
    totalBytes: snapshots.reduce((sum, s) => sum + s.sizeBytes, 0),
    count: snapshots.length,
  };
});

// ===== UI状態（一時的） =====

/** ダイアログ状態 */
export const dialogStateAtom = atom<DialogState>({
  type: null,
  props: null,
});

interface DialogState {
  type: 'confirm' | 'capacity-warning' | 'snapshot-create' | 'snapshot-edit' | 'mod-add' | null;
  props: Record<string, unknown> | null;
}

// ===== データAtom（サーバー状態のキャッシュとして使用は非推奨） =====
// → TanStack Queryを使用するため、ここでは定義しない
```

### 3.2 グローバル vs ローカル状態の判断基準

| 状態 | 種別 | 理由 |
|------|------|------|
| 現在のスナップショットID | **グローバル** | ヘッダー、各ページで参照 |
| 現在のタブ | **グローバル** | URL/ナビゲーションと連動 |
| 未保存変更フラグ | **グローバル** | ヘッダーで表示、各操作で更新 |
| アプリ設定 | **グローバル（永続化）** | 全体で適用、ブラウザ再起動後も保持 |
| ダイアログ状態 | **グローバル** | どこからでも開閉可能 |
| スナップショット一覧 | **サーバー状態** | TanStack Queryで管理 |
| Mod一覧 | **サーバー状態** | TanStack Queryで管理 |
| フォーム入力値 | **ローカル** | ダイアログ内でのみ使用 |
| ホバー/フォーカス状態 | **ローカル** | コンポーネント内でのみ使用 |
| 検索クエリ | **ローカル** | ページ内でのみ使用 |
| 選択状態（チェックボックス） | **ローカル** | ダイアログ/ページ内でのみ使用 |

### 3.3 Atoms 使用例

```typescript
// コンポーネントでの使用例
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

function Header() {
  // 読み取りのみ
  const currentSnapshot = useAtomValue(currentSnapshotAtom);
  const hasUnsavedChanges = useAtomValue(hasUnsavedChangesAtom);

  return (
    <header>
      <CurrentStatus
        snapshotName={currentSnapshot?.name ?? null}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </header>
  );
}

function ModRow({ mod, onToggle }) {
  // 書き込みのみ
  const setHasUnsavedChanges = useSetAtom(hasUnsavedChangesAtom);

  const handleToggle = () => {
    onToggle(mod.id, !mod.enabled);
    setHasUnsavedChanges(true);
  };

  return <Checkbox checked={mod.enabled} onChange={handleToggle} />;
}
```

---

## 4. TanStack Query 設計

### 4.1 クエリキー設計

```typescript
// src/lib/queryKeys.ts

export const queryKeys = {
  // スナップショット関連
  snapshots: {
    all: ['snapshots'] as const,
    detail: (id: string) => ['snapshots', id] as const,
  },

  // Mod関連
  mods: {
    all: ['mods'] as const,
    search: (query: string) => ['mods', 'search', query] as const,
  },

  // ゲームバージョン関連
  gameVersions: {
    all: ['gameVersions'] as const,
    available: ['gameVersions', 'available'] as const,
    downloaded: ['gameVersions', 'downloaded'] as const,
  },

  // ストレージ関連
  storage: {
    usage: ['storage', 'usage'] as const,
  },

  // 現在の状態
  currentState: ['currentState'] as const,
} as const;
```

### 4.2 クエリフック

```typescript
// src/hooks/useSnapshots.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { snapshotApi } from '@/lib/api';

/** スナップショット一覧取得 */
export function useSnapshots() {
  return useQuery({
    queryKey: queryKeys.snapshots.all,
    queryFn: snapshotApi.getAll,
    staleTime: 30 * 1000, // 30秒
  });
}

/** 単一スナップショット取得 */
export function useSnapshot(id: string) {
  return useQuery({
    queryKey: queryKeys.snapshots.detail(id),
    queryFn: () => snapshotApi.getById(id),
    enabled: !!id,
  });
}

/** 現在の状態取得 */
export function useCurrentState() {
  return useQuery({
    queryKey: queryKeys.currentState,
    queryFn: snapshotApi.getCurrentState,
    staleTime: 10 * 1000, // 10秒
    refetchOnWindowFocus: true,
  });
}
```

### 4.3 ミューテーション設計

```typescript
// src/hooks/useSnapshotMutations.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { snapshotApi } from '@/lib/api';

/** スナップショット作成 */
export function useCreateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: snapshotApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.usage });
    },
  });
}

/** スナップショット切替 */
export function useSwitchSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: snapshotApi.switchTo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentState });
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.all });
    },
  });
}

/** スナップショット削除 */
export function useDeleteSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: snapshotApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.usage });
    },
  });
}

/** スナップショット複製 */
export function useDuplicateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      snapshotApi.duplicate(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.usage });
    },
  });
}
```

### 4.4 Mod関連フック

```typescript
// src/hooks/useMods.ts

/** Mod一覧取得 */
export function useMods() {
  return useQuery({
    queryKey: queryKeys.mods.all,
    queryFn: modApi.getAll,
    staleTime: 30 * 1000,
  });
}

/** Mod有効/無効切替 */
export function useToggleMod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      modApi.toggle(id, enabled),
    // 楽観的更新
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.mods.all });

      const previousMods = queryClient.getQueryData<Mod[]>(queryKeys.mods.all);

      queryClient.setQueryData<Mod[]>(queryKeys.mods.all, (old) =>
        old?.map((mod) =>
          mod.id === id ? { ...mod, enabled } : mod
        )
      );

      return { previousMods };
    },
    onError: (err, variables, context) => {
      if (context?.previousMods) {
        queryClient.setQueryData(queryKeys.mods.all, context.previousMods);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.all });
    },
  });
}

/** Mod削除 */
export function useDeleteMod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: modApi.delete,
    // 楽観的更新
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.mods.all });

      const previousMods = queryClient.getQueryData<Mod[]>(queryKeys.mods.all);

      queryClient.setQueryData<Mod[]>(queryKeys.mods.all, (old) =>
        old?.filter((mod) => mod.id !== id)
      );

      return { previousMods };
    },
    onError: (err, variables, context) => {
      if (context?.previousMods) {
        queryClient.setQueryData(queryKeys.mods.all, context.previousMods);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.all });
    },
  });
}
```

### 4.5 楽観的更新パターン

| 操作 | 楽観的更新 | 理由 |
|------|-----------|------|
| Mod有効/無効切替 | **あり** | 即座にUI反映が必要、失敗時はロールバック |
| Mod削除 | **あり** | UX向上のため即座に消える |
| スナップショット作成 | **なし** | サーバー処理が必要（ID生成等） |
| スナップショット切替 | **なし** | 重要な操作、確実な完了確認が必要 |
| スナップショット削除 | **なし** | 危険な操作、確実な完了確認が必要 |

---

## 5. アクセシビリティ考慮

### 5.1 キーボードナビゲーション

| コンポーネント | キーボード操作 |
|---------------|---------------|
| TabNavigation | `←` `→` でタブ切替、`Enter` / `Space` で選択 |
| SnapshotCard | `Tab` でフォーカス移動、`Enter` で詳細展開 |
| SnapshotActions | `Tab` で各ボタン間移動、`Enter` で実行 |
| ModTable | `↑` `↓` で行移動、`Space` で有効/無効切替 |
| Dialog | `Esc` で閉じる、`Tab` でフォーカストラップ |
| ConfirmDialog | `Enter` で確認、`Esc` でキャンセル |

### 5.2 実装パターン

```typescript
// タブナビゲーションのキーボード対応
function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const tabIds: TabId[] = ['snapshots', 'mods', 'settings'];

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabIds.length;
      onTabChange(tabIds[nextIndex]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
      onTabChange(tabIds[prevIndex]);
    }
  };

  return (
    <div role="tablist" aria-label="メインナビゲーション">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### 5.3 スクリーンリーダー対応

```typescript
// SnapshotCard のアクセシビリティ対応
function SnapshotCard({ snapshot, ...actions }: SnapshotCardProps) {
  return (
    <article
      aria-labelledby={`snapshot-title-${snapshot.id}`}
      aria-describedby={`snapshot-desc-${snapshot.id}`}
    >
      <h3 id={`snapshot-title-${snapshot.id}`}>
        {snapshot.isActive && (
          <span className="sr-only">現在使用中: </span>
        )}
        {snapshot.name}
      </h3>

      <p id={`snapshot-desc-${snapshot.id}`} className="sr-only">
        {`${snapshot.gameVersion.type} ${snapshot.gameVersion.version}、`}
        {`${snapshot.modCount}個のMod、`}
        {`${formatBytes(snapshot.sizeBytes)}`}
      </p>

      <div aria-label={`${snapshot.name}の詳細情報`}>
        <span aria-label="ゲームバージョン">
          {snapshot.gameVersion.type} {snapshot.gameVersion.version}
        </span>
        <span aria-label="Mod数">{snapshot.modCount}個</span>
        <span aria-label="容量">{formatBytes(snapshot.sizeBytes)}</span>
      </div>

      <div role="group" aria-label={`${snapshot.name}の操作`}>
        <button
          onClick={() => actions.onSwitch(snapshot.id)}
          aria-disabled={snapshot.isActive}
          aria-label={snapshot.isActive ? '現在使用中' : 'この環境に切り替える'}
        >
          切替
        </button>
        {/* 他のボタン */}
      </div>
    </article>
  );
}
```

### 5.4 ARIA属性一覧

| コンポーネント | 必須ARIA属性 |
|---------------|-------------|
| TabNavigation | `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` |
| TabPanel | `role="tabpanel"`, `aria-labelledby` |
| SnapshotCard | `aria-labelledby`, `aria-describedby` |
| Dialog | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| ModToggle | `role="switch"`, `aria-checked` |
| ProgressBar | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| Toast | `role="alert"`, `aria-live="polite"` |
| StatusIndicator | `aria-label`（色だけでなくテキストでも状態を伝える） |

### 5.5 フォーカス管理

```typescript
// ダイアログのフォーカストラップ
function Dialog({ open, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      // 開く前のフォーカス要素を記憶
      previousFocusRef.current = document.activeElement as HTMLElement;
      // ダイアログにフォーカス
      dialogRef.current?.focus();
    } else {
      // 閉じたら元の要素にフォーカスを戻す
      previousFocusRef.current?.focus();
    }
  }, [open]);

  // Escキーで閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <FocusTrap>{children}</FocusTrap>
    </div>
  );
}
```

---

## 6. 要検討事項

### 6.1 技術的な検討事項

| 項目 | 選択肢 | 推奨 | 理由 |
|------|--------|------|------|
| スタイリング | CSS Modules / Tailwind / styled-components | **要確認** | 既存コードベースに依存 |
| アイコンライブラリ | Lucide / Heroicons / カスタム | **要確認** | デザインシステムに依存 |
| フォーム管理 | React Hook Form / 独自実装 | React Hook Form | バリデーション込みで便利 |
| アニメーション | CSS Transitions / Framer Motion | CSS Transitions | シンプルさ優先 |

### 6.2 設計上の検討事項

| 項目 | 内容 |
|------|------|
| エラーハンドリング | グローバルエラーバウンダリ + ローカルエラー表示の設計が必要 |
| ローディング状態 | スケルトン vs スピナー vs インライン表示の統一ルール |
| レスポンシブ対応 | ブレークポイントの定義、モバイルでのスナップショットカード表示 |
| i18n | 日本語/英語切替時の文字列管理方法 |

### 6.3 Tauri連携の確認事項

| 項目 | 確認内容 |
|------|----------|
| IPC通信 | `@tauri-apps/api` のinvoke関数でバックエンドと通信 |
| ファイルダイアログ | `@tauri-apps/api/dialog` でファイル選択UI |
| シェルコマンド | ゲーム起動は `@tauri-apps/api/shell` を使用 |
| イベント | バックエンドからのプッシュ通知に `listen` を使用 |

---

## 7. まとめ

### 設計のポイント

1. **コンポーネント分割**: 責務を明確に分離し、再利用性を高める
2. **状態管理**: Jotaiでグローバル状態、TanStack Queryでサーバー状態を管理
3. **楽観的更新**: 軽微な操作（Modトグル等）は即座にUI反映
4. **アクセシビリティ**: キーボード操作とスクリーンリーダーに完全対応

### 次のステップ

1. 既存コードベースの確認（スタイリング方式等）
2. 共通コンポーネント（Button, Input等）の実装
3. レイアウトコンポーネントの実装
4. 各ページコンポーネントの実装

---

*本設計書は UI_WIREFRAME.md および VISION.md を基に作成*
