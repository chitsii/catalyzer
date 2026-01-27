# Catalyzer Backlog

> **Last Updated**: 2026-01-27
> **Status**: Active
> **Vision**: See [docs/VISION.md](docs/VISION.md)

---

## 0. Product Vision (New Architecture)

> 新設計に基づく大項目。Phase 2以降で実装。

### V-001: Snapshot System Design
- **Description**: 環境スナップショット機能の設計・実装
- **Details**:
  - ゲームバージョンID（再DL可能なのでIDのみ保存）
  - Mod構成（実ファイル or アーカイブ）
  - 設定ファイル
  - セーブデータ
- **Priority**: Phase 2

### V-002: Clear State Display
- **Description**: 現在の状態を常時表示
- **Details**:
  - ヘッダーに「Stable 0.I + Mod構成名」を表示
  - 現在と保存状態の差分表示
- **Priority**: Phase 2

### V-003: Easy Editing
- **Description**: 構成の編集を簡単に
- **Details**:
  - Mod追加/削除のシンプル化
  - インライン名前変更
  - 構成の複製
- **Priority**: Phase 2

### V-004: Git Deprecation
- **Description**: git機能の段階的廃止
- **Details**:
  - Phase 2: gitを内部実装に隠蔽
  - Phase 3: ユーザーUIからgit概念を完全削除
- **Priority**: Phase 3

### V-005: Game Version Management Refactor
- **Description**: ゲームバージョン管理のリファクタ
- **Details**:
  - バージョンIDでの管理
  - 必要時のみダウンロード
  - Stable/Experimentalの明確な分離
- **Priority**: Phase 2

---

## 1. Communication (Next.js - Rust)

### L-COM-001: Full Settings Fetch on Every Call
- **Problem**: `getSettings()` returns entire Settings object cloned
- **Location**: `src/lib/api.ts`, `src-tauri/src/profile/mod.rs`
- **Impact**: Performance
- **Solution**: Implement delta fetch or partial data retrieval
- **Priority**: High

### L-COM-002: Full Window Reload on Profile Switch
- **Problem**: `windowReload()` called when switching profiles
- **Location**: `src/components/profile-switcher.tsx:95`
- **Impact**: UX - feels slow
- **Solution**: Update state without full reload
- **Priority**: High

### L-COM-003: Redundant Mod List Refresh
- **Problem**: Full mod scan on every table operation
- **Location**: `src/components/atoms.tsx:68-76`, `src/components/datatable/mod-table/columns.tsx:248,407`
- **Impact**: Performance
- **Solution**: Implement caching, only refresh on actual changes
- **Priority**: High

### L-COM-004: No Error Handling in invoke_safe
- **Problem**: No try-catch, undefined behavior on error
- **Location**: `src/lib/invoke-safe.ts`
- **Impact**: Reliability
- **Solution**: Add proper error handling and user feedback
- **Priority**: Medium

### L-COM-005: Blocking API Usage
- **Problem**: `reqwest::blocking` used in async context
- **Location**: `src-tauri/src/cdda/release.rs:81,193`
- **Impact**: Performance, potential thread blocking
- **Solution**: Migrate to async/await consistently
- **Priority**: Medium

### L-COM-006: Frequent Config File Writes
- **Problem**: `write_file()` called on every operation
- **Location**: `src-tauri/src/profile/mod.rs`
- **Impact**: I/O performance
- **Solution**: Batch writes or debounce
- **Priority**: Low

---

## 2. Type Definitions

### L-TYPE-001: Duplicate Type Definitions
- **Problem**: Same types defined in multiple files
- **Location**: `src/components/atoms.tsx:21-34`, `src/components/datatable/mod-table/columns.tsx:52-76`
- **Impact**: Maintainability
- **Solution**: Consolidate into shared type definition file
- **Priority**: Medium

### L-TYPE-002: Inconsistent Naming Convention
- **Problem**: snake_case in Rust, camelCase in TS without mapping
- **Location**: Throughout codebase
- **Impact**: Developer confusion, potential bugs
- **Solution**: Use serde `rename_all` for automatic conversion
- **Priority**: Medium

### L-TYPE-003: Use of `any` Type
- **Problem**: `any` type bypasses TypeScript safety
- **Location**: `src/components/profile-switcher.tsx:146,301`, `src/components/datatable/mod-table/columns.tsx:234,370`
- **Impact**: Type safety
- **Solution**: Define proper types
- **Priority**: Medium

---

## 3. Profile Feature

### L-PROF-001: Logic Bug - Always False Condition
- **Problem**: `game_path.is_none() && game_path.is_some()` is always false
- **Location**: `src-tauri/src/profile/mod.rs:388`
- **Impact**: Bug - validation never triggers
- **Solution**: Fix the condition logic
- **Priority**: High (Bug)

### L-PROF-002: Excessive unwrap() Usage
- **Problem**: Many unwrap() calls that can panic
- **Location**: `src-tauri/src/profile/mod.rs:75,140,317,324,444`
- **Impact**: Stability
- **Solution**: Proper error handling with Result/Option
- **Priority**: Medium

### L-PROF-003: Profile Rename Leaves Old Directory
- **Problem**: When profile name changes, old directory remains
- **Location**: `src-tauri/src/profile/mod.rs:446-452` (edit_profile)
- **Impact**: Disk space, confusion
- **Solution**: Move or delete old directory on rename
- **Priority**: Medium

### L-PROF-004: Scattered Default Profile Handling
- **Problem**: `id === "default"` checks scattered throughout code
- **Location**: Multiple files
- **Impact**: Maintainability
- **Solution**: Centralize default profile logic, use constants
- **Priority**: Low

### L-PROF-005: Wide Mutex Lock Scope
- **Problem**: Lock held for entire command duration
- **Location**: `src-tauri/src/profile/mod.rs` commands module
- **Impact**: Potential contention
- **Solution**: Minimize lock scope
- **Priority**: Low

### L-PROF-006: mod_status Nested in Settings
- **Problem**: Mod status stored inside Profile inside Settings
- **Location**: Profile struct
- **Impact**: Data coupling, large data transfers
- **Solution**: Normalize data or implement lazy loading
- **Priority**: Low

---

## 4. Game Download Feature

### L-DL-007: Experimental Download URL Broken (CRITICAL)
- **Problem**: `infer_experimental_download_url()` generates wrong URLs
- **Location**: `src-tauri/src/cdda/release.rs:28-48`
- **Impact**: **Download fails with 404** - feature completely broken
- **Details**:
  - Code generates: `cdda-osx-tiles-universal-{date}.dmg`
  - Actual file: `cdda-osx-with-graphics-universal-{date}.dmg`
  - Code generates: `cdda-windows-tiles-sounds-x64-msvc-{date}.zip`
  - Actual file: `cdda-windows-with-graphics-and-sounds-x64-{date}.zip`
- **Solution**: Fetch download URL from GitHub API assets instead of inferring
- **Priority**: **Critical** (Feature broken)

### L-DL-008: Stable Build Should Be Hardcoded
- **Problem**: Dynamic detection of stable releases is fragile and wastes API calls
- **Location**: `src-tauri/src/cdda/release.rs:151-166`
- **Impact**: Unnecessary complexity, API rate limit risk
- **Details**:
  - Stable releases only happen 1-2 times per year
  - Current regex `^0\.[A-Z](?:-(?:\d+|RELEASE))?$` may not match new format `cdda-0.I-2026-01-20-1811`
- **Solution**: Hardcode stable release info (tag, URLs) - update on new stable release
- **Priority**: High

### L-DL-001: Linux Not Supported (Panic)
- **Problem**: Code panics on Linux instead of graceful error
- **Location**: `src-tauri/src/cdda/release.rs:72-74`, `src-tauri/src/main.rs:169-171`
- **Impact**: Crash on Linux
- **Solution**: Return proper error, show message to user
- **Priority**: Medium

### L-DL-002: GitHub API Rate Limit Not Handled
- **Problem**: No caching, no auth token support
- **Location**: `src-tauri/src/cdda/release.rs:51-61`
- **Impact**: API failures for heavy users (60 req/hour without auth)
- **Solution**: Add optional GITHUB_TOKEN support, cache release info
- **Priority**: Medium

### L-DL-003: Fragile Download URL Inference (Superseded by L-DL-007)
- **Problem**: Regex assumes specific URL format
- **Location**: `infer_experimental_download_url()`
- **Impact**: Breaks if GitHub changes format
- **Solution**: Use API to get actual download URL
- **Priority**: Low (see L-DL-007)

### L-DL-004: Unnecessary Shallow Clone
- **Problem**: Clones entire repo just for tag listing
- **Location**: `shallow_clone_cdda()`
- **Impact**: Wasted bandwidth/time
- **Solution**: Use ls-remote only for tag listing
- **Priority**: Low

### L-DL-005: No Download Progress Indication
- **Problem**: User has no feedback during download
- **Location**: Download feature
- **Impact**: UX - appears frozen
- **Solution**: Implement progress events
- **Priority**: Medium

### L-DL-006: No Release Info Caching
- **Problem**: GitHub API called every time
- **Location**: `cdda_get_*_releases()`
- **Impact**: Slow, rate limit risk
- **Solution**: Cache release info with TTL
- **Priority**: Low

---

## 5. UX - Operations

### U-OP-001: Full Reload on Profile Switch
- **Problem**: Entire window reloads when switching profiles
- **Location**: `src/components/profile-switcher.tsx:95`
- **Impact**: Jarring UX
- **Solution**: Smooth state transition
- **Priority**: High

### U-OP-002: No Confirmation for Mod Install/Uninstall
- **Problem**: Toggle immediately executes action
- **Location**: `src/components/datatable/mod-table/columns.tsx:477-485`
- **Impact**: Accidental changes
- **Solution**: Add confirmation or undo option
- **Priority**: Medium

### U-OP-003: Branch Switch Without Await
- **Problem**: No await, no result verification
- **Location**: `src/components/datatable/mod-table/columns.tsx:243-248`
- **Impact**: Unclear if operation succeeded
- **Solution**: Await and show result
- **Priority**: Medium

### U-OP-004: Complex New Branch Creation Flow
- **Problem**: Too many steps in dialog
- **Location**: `src/components/datatable/mod-table/columns.tsx:294-418`
- **Impact**: Confusing UX
- **Solution**: Simplify flow or add wizard
- **Priority**: Low

### U-OP-005: Insufficient Error Feedback
- **Problem**: Only popUp() with minimal info
- **Location**: Throughout codebase
- **Impact**: User can't understand/fix issues
- **Solution**: Detailed error messages, actionable guidance
- **Priority**: Medium

---

## 6. UX - i18n / Hardcoded Strings

### U-I18N-001: Hardcoded Japanese in profile-switcher
- **Problem**: Many Japanese strings not using i18n
- **Location**: `src/components/profile-switcher.tsx:139,169,176,196,229,234,246,252,273,317`
- **Impact**: Non-Japanese users
- **Solution**: Move all strings to i18n
- **Priority**: High

### U-I18N-002: Hardcoded Japanese in page.tsx
- **Problem**: Dialog messages in Japanese
- **Location**: `src/app/page.tsx:161-164,170`
- **Impact**: Non-Japanese users
- **Solution**: Use i18n
- **Priority**: High

### U-I18N-003: Hardcoded Japanese in columns.tsx
- **Problem**: Some labels and error messages in Japanese
- **Location**: `src/components/datatable/mod-table/columns.tsx:109,113,381`
- **Impact**: Non-Japanese users
- **Solution**: Use i18n
- **Priority**: Medium

### U-I18N-004: Default Language Hardcoded in Rust
- **Problem**: Default language is "ja"
- **Location**: `src-tauri/src/profile/mod.rs:123`
- **Impact**: Non-Japanese users on first launch
- **Solution**: Detect system language or prompt user
- **Priority**: Low

---

## 7. UX - UI/Display

### U-UI-001: Basic Loading Display
- **Problem**: Plain "Loading..." text
- **Location**: `src/components/profile-switcher.tsx:72`
- **Impact**: Unprofessional feel
- **Solution**: Implement skeleton UI
- **Priority**: Low

### U-UI-002: No Guidance When No Profile
- **Problem**: Just shows "No Profile"
- **Location**: `src/components/profile-switcher.tsx:125`
- **Impact**: New users confused
- **Solution**: Add button/link to create profile
- **Priority**: Medium

### U-UI-003: Confusing Subwindow Wait UI
- **Problem**: Shows spinner with "Escで解除"
- **Location**: `src/components/profile-switcher.tsx:194-218`
- **Impact**: Unclear what user should do
- **Solution**: Better messaging, auto-close on completion
- **Priority**: Low

### U-UI-004: Fixed Table Column Sizes
- **Problem**: Hard-coded size/minSize values
- **Location**: `src/components/datatable/mod-table/columns.tsx`
- **Impact**: Not responsive
- **Solution**: Make columns responsive
- **Priority**: Low

### U-UI-005: N/A Version Meaning Unclear
- **Problem**: "N/A" button without explanation
- **Location**: `src/components/datatable/mod-table/columns.tsx:429`
- **Impact**: User confusion
- **Solution**: Add tooltip explaining version control not initialized
- **Priority**: Low

---

## 8. UX - Performance Perception

### U-PERF-001: Mod Rescan on Tab Switch
- **Problem**: refresh() called when clicking Mods tab
- **Location**: `src/app/page.tsx:82`
- **Impact**: Feels slow
- **Solution**: Use cached data, background refresh
- **Priority**: Medium

### U-PERF-002: Slow Initial Startup
- **Problem**: Splash screen visible for too long
- **Location**: Startup flow
- **Impact**: Feels slow
- **Solution**: Lazy loading, optimize startup sequence
- **Priority**: Low

### U-PERF-003: Branch List Fetched on Every Hover
- **Problem**: onMouseEnter triggers branch fetch
- **Location**: `src/components/datatable/mod-table/columns.tsx:226`
- **Impact**: Unnecessary API calls
- **Solution**: Cache branch list, debounce
- **Priority**: Low

---

## 9. Code Quality

### Q-001: Global Variable
- **Problem**: `IS_LOGGER_ATTACHED` as module-level variable
- **Location**: `src/app/page.tsx:36`
- **Impact**: Not React-idiomatic
- **Solution**: Use useRef or state
- **Priority**: Low

### Q-002: Oversized Components
- **Problem**: Single files with 400-500+ lines
- **Location**: `columns.tsx (501 lines)`, `profile-switcher.tsx (392 lines)`
- **Impact**: Hard to maintain
- **Solution**: Split into smaller components
- **Priority**: Low

### Q-003: Invalid JSX Attribute
- **Problem**: `stroke-width` should be `strokeWidth`
- **Location**: `src/components/profile-switcher.tsx:209`
- **Impact**: React warning
- **Solution**: Use camelCase
- **Priority**: Low

### Q-004: Unused Dummy Data File
- **Problem**: Large dummy data file (513 lines) may be unused
- **Location**: `src/app/webviews/profile/dummy_data.ts`
- **Impact**: Bundle size
- **Solution**: Remove if unused
- **Priority**: Low

### Q-005: Wrong Package Name
- **Problem**: package.json name is "my-app"
- **Location**: `package.json:2`
- **Impact**: Confusing
- **Solution**: Change to "catalyzer"
- **Priority**: Low

---

## Priority Summary

### Critical Priority
- **L-DL-007**: Experimental download URL broken (feature non-functional)

### High Priority
- L-DL-008 (Stable build hardcoding)
- L-COM-001, L-COM-002, L-COM-003 (Communication inefficiency)
- L-PROF-001 (Bug fix)
- U-OP-001 (Profile switch reload)
- U-I18N-001, U-I18N-002 (Hardcoded Japanese)

### Medium Priority
- L-COM-004, L-COM-005 (Error handling, async)
- L-TYPE-001, L-TYPE-002, L-TYPE-003 (Type definitions)
- L-PROF-002, L-PROF-003 (Profile bugs)
- L-DL-001, L-DL-002, L-DL-005 (Download feature)
- U-OP-002, U-OP-003, U-OP-005 (Operation UX)
- U-I18N-003 (i18n)
- U-UI-002, U-PERF-001 (UI/Performance)

### Low Priority
- Remaining items (refactoring, optimization)
