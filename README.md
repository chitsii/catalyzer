# Catalyzer

A cross-platform and lightweight mod manager & launcher for [Cataclysm: Dark Days Ahead](https://github.com/CleverRaven/Cataclysm-DDA).

![Demo v0 1 0 loop count](https://github.com/chitsii/catalyzer/assets/59207213/2b76ab61-6fd4-403f-90fa-6a7ccf8aaa06)

## Features

- **Manage custom user profiles**
  - Each profile retains its own mod set, mod version (git branch), user files, and game path, which enables switching between different game versions with preferred mods installed.
- **git based mod management**
  - Add, remove, or update mod versions.

## Installation & Usage

Download the latest release from the release page, move it to your desired location then run it. 

You may need to create a new profile to start managing mods. Default profile is created with the game path set to the default game path for the respective OS, but if game was not there, path is set to None. You can set the game path in a new profile.

MacOS (arm64) and Windows (x86_64) are supported.

## Why?

Because there was no launcher for MacOS!

## Planned Features

- Multilingual support
- Download mods from Github via integrated git client
- Font / Soundpack presets
- Something to alleviate the burden of updating mod (llm powered Json editor maybe?)

*** 

# カタライザー

クロスプラットフォームで軽量な[Cataclysm: Dark Days Ahead](https://github.com/CleverRaven/Cataclysm-DDA)向けMod管理ツールです。

## 機能
- **カスタムユーザープロファイルの管理**
  - Modラインナップ、各Modのデータ断面、セーブおよびコンフィグ設定をプリセットに記録した状態にセットアップし、実行対象となるゲームのバージョンを起動できます。
- **gitベースのMod管理**
  - 各々のModのバージョンを追加、削除、または更新

## インストール方法

リリースページから最新のリリースをダウンロードして、希望の場所に解凍
MacOS (arm64), Windows (x86_64)をサポートしています。

## なんでつくったん

MacOsに対応したランチャーがなかったんや！

## 今後の予定

- 多言語対応
- 統合gitクライアントを使用してGithubからModをダウンロード
- フォント/サウンドパックプリセット
- Modメンテナンスツール（LLMを使ったJsonスキーマ検証など）

---

### Build from source

1. Install Rust latest stable from [here](https://www.rust-lang.org/tools/install). Minimum version: 1.70
2. Install tauri-cli

```bash
cargo install tauri-cli
```

3. Clone this repository and navigate to the root directory.
4. Run the following command to build the project.

```bash
cargo tauri build
```

For building the project in development mode, run the following command.

```bash
cargo tauri dev
```

For more information, refer to [Tauri](https://github.com/tauri-apps/tauri).

---
