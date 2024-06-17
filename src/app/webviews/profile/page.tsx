"use client";

import { useState } from "react";
import { popUp } from "@/lib/utils";
import { debug, info, warn } from "@tauri-apps/plugin-log";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import ProgressButton from "@/components/progress-button/progress-button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { download } from "@tauri-apps/plugin-upload";

type DownloaderProps = {
  release: Release;
};
const GameDownloader = ({ release }: DownloaderProps) => {
  const [manualProgress, setManualProgress] = useState(0);

  // TODO: get platform
  const platform_asset = release.assets[0];
  const download_url = platform_asset.browser_download_url;
  const save_path = `/Users/fanjiang/Downloads/${release.tag_name}.zip`;

  return (
    <div className="flex flex-col justify-center items-center">
      <ProgressButton
        progressType="manual"
        progress={manualProgress}
        successColorClass="teal-500"
        onClick={async () => {
          await download(download_url, save_path, ({ progress, total }) => {
            debug(`Downloaded ${progress} of ${total} bytes`);
            setManualProgress((progress / total) * 100);
          });
        }}
        onComplete={() => {
          popUp("success", `Downloaded ${download_url} to ${save_path}`);
          info(`Downloaded ${download_url} to ${save_path}`);
        }}
        onError={(error) => {
          popUp("failed", `Downloaded ${download_url} to ${save_path}`);
          warn(JSON.stringify(error));
        }}
      />
    </div>
  );
};

type Release = {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  author: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  node_id: string;
  tag_name: string; // 重要
  target_commitish: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string; //重要
  assets: Asset[];
  tarball_url: string;
  zipball_url: string;
  body: string; //重要
};
type Asset = {
  url: string;
  id: number; //重要
  node_id: string;
  name: string;
  label: string | null;
  uploader: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  content_type: string;
  state: string;
  size: number; //重要
  download_count: number; // 重要
  created_at: string;
  updated_at: string;
  browser_download_url: string; // 重要
};
// https://api.github.com/repos/chitsii/catalyzer/releases
const dummy_data: Release[] = [
  {
    url: "https://api.github.com/repos/chitsii/catalyzer/releases/160721410",
    assets_url: "https://api.github.com/repos/chitsii/catalyzer/releases/160721410/assets",
    upload_url: "https://uploads.github.com/repos/chitsii/catalyzer/releases/160721410/assets{?name,label}",
    html_url: "https://github.com/chitsii/catalyzer/releases/tag/v0.1.0-alpha2",
    id: 160721410,
    author: {
      login: "chitsii",
      id: 59207213,
      node_id: "MDQ6VXNlcjU5MjA3MjEz",
      avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/chitsii",
      html_url: "https://github.com/chitsii",
      followers_url: "https://api.github.com/users/chitsii/followers",
      following_url: "https://api.github.com/users/chitsii/following{/other_user}",
      gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
      starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
      organizations_url: "https://api.github.com/users/chitsii/orgs",
      repos_url: "https://api.github.com/users/chitsii/repos",
      events_url: "https://api.github.com/users/chitsii/events{/privacy}",
      received_events_url: "https://api.github.com/users/chitsii/received_events",
      type: "User",
      site_admin: false,
    },
    node_id: "RE_kwDOMHUpKM4JlGoC",
    tag_name: "v0.1.0-alpha2",
    target_commitish: "main",
    name: "v0.1.0-alpha2",
    draft: false,
    prerelease: true,
    created_at: "2024-06-16T18:21:07Z",
    published_at: "2024-06-16T18:37:48Z",
    assets: [
      {
        url: "https://api.github.com/repos/chitsii/catalyzer/releases/assets/174142660",
        id: 174142660,
        node_id: "RA_kwDOMHUpKM4KYTTE",
        name: "catalyzer-macos_aarch64.zip",
        label: null,
        uploader: {
          login: "chitsii",
          id: 59207213,
          node_id: "MDQ6VXNlcjU5MjA3MjEz",
          avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/chitsii",
          html_url: "https://github.com/chitsii",
          followers_url: "https://api.github.com/users/chitsii/followers",
          following_url: "https://api.github.com/users/chitsii/following{/other_user}",
          gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
          starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
          subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
          organizations_url: "https://api.github.com/users/chitsii/orgs",
          repos_url: "https://api.github.com/users/chitsii/repos",
          events_url: "https://api.github.com/users/chitsii/events{/privacy}",
          received_events_url: "https://api.github.com/users/chitsii/received_events",
          type: "User",
          site_admin: false,
        },
        content_type: "application/zip",
        state: "uploaded",
        size: 4006464,
        download_count: 0,
        created_at: "2024-06-16T18:29:59Z",
        updated_at: "2024-06-16T18:30:02Z",
        browser_download_url:
          "https://github.com/chitsii/catalyzer/releases/download/v0.1.0-alpha2/catalyzer-macos_aarch64.zip",
      },
      {
        url: "https://api.github.com/repos/chitsii/catalyzer/releases/assets/174142661",
        id: 174142661,
        node_id: "RA_kwDOMHUpKM4KYTTF",
        name: "catalyzer-windows_x86_64.zip",
        label: null,
        uploader: {
          login: "chitsii",
          id: 59207213,
          node_id: "MDQ6VXNlcjU5MjA3MjEz",
          avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/chitsii",
          html_url: "https://github.com/chitsii",
          followers_url: "https://api.github.com/users/chitsii/followers",
          following_url: "https://api.github.com/users/chitsii/following{/other_user}",
          gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
          starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
          subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
          organizations_url: "https://api.github.com/users/chitsii/orgs",
          repos_url: "https://api.github.com/users/chitsii/repos",
          events_url: "https://api.github.com/users/chitsii/events{/privacy}",
          received_events_url: "https://api.github.com/users/chitsii/received_events",
          type: "User",
          site_admin: false,
        },
        content_type: "application/zip",
        state: "uploaded",
        size: 4427860,
        download_count: 0,
        created_at: "2024-06-16T18:30:02Z",
        updated_at: "2024-06-16T18:30:02Z",
        browser_download_url:
          "https://github.com/chitsii/catalyzer/releases/download/v0.1.0-alpha2/catalyzer-windows_x86_64.zip",
      },
    ],
    tarball_url: "https://api.github.com/repos/chitsii/catalyzer/tarball/v0.1.0-alpha2",
    zipball_url: "https://api.github.com/repos/chitsii/catalyzer/zipball/v0.1.0-alpha2",
    body: "* feat: command palette\r\n    * introduce CommandPalette activation prompt shortcut(Ctrl/Cmd + P/K)\r\n    * add git fetch functionality to repository operations\r\n    * add git clone functionality to repository operations\r\n\r\n* chore: migrate Tauri to v2.0-beta\r\n    * fix: update logger import to use @tauri-apps/plugin-log\r\n    * cleanup: delete commented-out drop event handling scripts\r\n    * fix: migration errors during upgrading Tauri to v2",
  },
  {
    url: "https://api.github.com/repos/chitsii/catalyzer/releases/159709985",
    assets_url: "https://api.github.com/repos/chitsii/catalyzer/releases/159709985/assets",
    upload_url: "https://uploads.github.com/repos/chitsii/catalyzer/releases/159709985/assets{?name,label}",
    html_url: "https://github.com/chitsii/catalyzer/releases/tag/v0.1.0-alpha",
    id: 159709985,
    author: {
      login: "chitsii",
      id: 59207213,
      node_id: "MDQ6VXNlcjU5MjA3MjEz",
      avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/chitsii",
      html_url: "https://github.com/chitsii",
      followers_url: "https://api.github.com/users/chitsii/followers",
      following_url: "https://api.github.com/users/chitsii/following{/other_user}",
      gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
      starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
      organizations_url: "https://api.github.com/users/chitsii/orgs",
      repos_url: "https://api.github.com/users/chitsii/repos",
      events_url: "https://api.github.com/users/chitsii/events{/privacy}",
      received_events_url: "https://api.github.com/users/chitsii/received_events",
      type: "User",
      site_admin: false,
    },
    node_id: "RE_kwDOMHUpKM4JhPsh",
    tag_name: "v0.1.0-alpha",
    target_commitish: "main",
    name: "v0.1.0-α",
    draft: false,
    prerelease: true,
    created_at: "2024-06-10T16:40:36Z",
    published_at: "2024-06-10T16:50:03Z",
    assets: [
      {
        url: "https://api.github.com/repos/chitsii/catalyzer/releases/assets/172978658",
        id: 172978658,
        node_id: "RA_kwDOMHUpKM4KT3Hi",
        name: "catalyzer-macos.zip",
        label: null,
        uploader: {
          login: "chitsii",
          id: 59207213,
          node_id: "MDQ6VXNlcjU5MjA3MjEz",
          avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/chitsii",
          html_url: "https://github.com/chitsii",
          followers_url: "https://api.github.com/users/chitsii/followers",
          following_url: "https://api.github.com/users/chitsii/following{/other_user}",
          gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
          starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
          subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
          organizations_url: "https://api.github.com/users/chitsii/orgs",
          repos_url: "https://api.github.com/users/chitsii/repos",
          events_url: "https://api.github.com/users/chitsii/events{/privacy}",
          received_events_url: "https://api.github.com/users/chitsii/received_events",
          type: "User",
          site_admin: false,
        },
        content_type: "application/zip",
        state: "uploaded",
        size: 6188021,
        download_count: 1,
        created_at: "2024-06-10T16:47:25Z",
        updated_at: "2024-06-10T16:47:28Z",
        browser_download_url: "https://github.com/chitsii/catalyzer/releases/download/v0.1.0-alpha/catalyzer-macos.zip",
      },
      {
        url: "https://api.github.com/repos/chitsii/catalyzer/releases/assets/172978723",
        id: 172978723,
        node_id: "RA_kwDOMHUpKM4KT3Ij",
        name: "catalyzer-x86_64-pc-windows-msvc.zip",
        label: null,
        uploader: {
          login: "chitsii",
          id: 59207213,
          node_id: "MDQ6VXNlcjU5MjA3MjEz",
          avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/chitsii",
          html_url: "https://github.com/chitsii",
          followers_url: "https://api.github.com/users/chitsii/followers",
          following_url: "https://api.github.com/users/chitsii/following{/other_user}",
          gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
          starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
          subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
          organizations_url: "https://api.github.com/users/chitsii/orgs",
          repos_url: "https://api.github.com/users/chitsii/repos",
          events_url: "https://api.github.com/users/chitsii/events{/privacy}",
          received_events_url: "https://api.github.com/users/chitsii/received_events",
          type: "User",
          site_admin: false,
        },
        content_type: "application/zip",
        state: "uploaded",
        size: 3793908,
        download_count: 5,
        created_at: "2024-06-10T16:48:09Z",
        updated_at: "2024-06-10T16:48:10Z",
        browser_download_url:
          "https://github.com/chitsii/catalyzer/releases/download/v0.1.0-alpha/catalyzer-x86_64-pc-windows-msvc.zip",
      },
    ],
    tarball_url: "https://api.github.com/repos/chitsii/catalyzer/tarball/v0.1.0-alpha",
    zipball_url: "https://api.github.com/repos/chitsii/catalyzer/zipball/v0.1.0-alpha",
    body: "",
  },
  {
    url: "https://api.github.com/repos/chitsii/catalyzer/releases/159709985",
    assets_url: "https://api.github.com/repos/chitsii/catalyzer/releases/159709985/assets",
    upload_url: "https://uploads.github.com/repos/chitsii/catalyzer/releases/159709985/assets{?name,label}",
    html_url: "https://github.com/chitsii/catalyzer/releases/tag/v0.1.0-alpha",
    id: 159709985,
    author: {
      login: "chitsii",
      id: 59207213,
      node_id: "MDQ6VXNlcjU5MjA3MjEz",
      avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/chitsii",
      html_url: "https://github.com/chitsii",
      followers_url: "https://api.github.com/users/chitsii/followers",
      following_url: "https://api.github.com/users/chitsii/following{/other_user}",
      gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
      starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
      organizations_url: "https://api.github.com/users/chitsii/orgs",
      repos_url: "https://api.github.com/users/chitsii/repos",
      events_url: "https://api.github.com/users/chitsii/events{/privacy}",
      received_events_url: "https://api.github.com/users/chitsii/received_events",
      type: "User",
      site_admin: false,
    },
    node_id: "RE_kwDOMHUpKM4JhPsh",
    tag_name: "v0.1.0-alpha",
    target_commitish: "main",
    name: "v0.1.0-α",
    draft: false,
    prerelease: true,
    created_at: "2024-06-10T16:40:36Z",
    published_at: "2024-06-10T16:50:03Z",
    assets: [
      {
        url: "https://api.github.com/repos/chitsii/catalyzer/releases/assets/172978658",
        id: 172978658,
        node_id: "RA_kwDOMHUpKM4KT3Hi",
        name: "catalyzer-macos.zip",
        label: null,
        uploader: {
          login: "chitsii",
          id: 59207213,
          node_id: "MDQ6VXNlcjU5MjA3MjEz",
          avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/chitsii",
          html_url: "https://github.com/chitsii",
          followers_url: "https://api.github.com/users/chitsii/followers",
          following_url: "https://api.github.com/users/chitsii/following{/other_user}",
          gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
          starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
          subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
          organizations_url: "https://api.github.com/users/chitsii/orgs",
          repos_url: "https://api.github.com/users/chitsii/repos",
          events_url: "https://api.github.com/users/chitsii/events{/privacy}",
          received_events_url: "https://api.github.com/users/chitsii/received_events",
          type: "User",
          site_admin: false,
        },
        content_type: "application/zip",
        state: "uploaded",
        size: 6188021,
        download_count: 1,
        created_at: "2024-06-10T16:47:25Z",
        updated_at: "2024-06-10T16:47:28Z",
        browser_download_url: "https://github.com/chitsii/catalyzer/releases/download/v0.1.0-alpha/catalyzer-macos.zip",
      },
      {
        url: "https://api.github.com/repos/chitsii/catalyzer/releases/assets/172978723",
        id: 172978723,
        node_id: "RA_kwDOMHUpKM4KT3Ij",
        name: "catalyzer-x86_64-pc-windows-msvc.zip",
        label: null,
        uploader: {
          login: "chitsii",
          id: 59207213,
          node_id: "MDQ6VXNlcjU5MjA3MjEz",
          avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/chitsii",
          html_url: "https://github.com/chitsii",
          followers_url: "https://api.github.com/users/chitsii/followers",
          following_url: "https://api.github.com/users/chitsii/following{/other_user}",
          gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
          starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
          subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
          organizations_url: "https://api.github.com/users/chitsii/orgs",
          repos_url: "https://api.github.com/users/chitsii/repos",
          events_url: "https://api.github.com/users/chitsii/events{/privacy}",
          received_events_url: "https://api.github.com/users/chitsii/received_events",
          type: "User",
          site_admin: false,
        },
        content_type: "application/zip",
        state: "uploaded",
        size: 3793908,
        download_count: 5,
        created_at: "2024-06-10T16:48:09Z",
        updated_at: "2024-06-10T16:48:10Z",
        browser_download_url:
          "https://github.com/chitsii/catalyzer/releases/download/v0.1.0-alpha/catalyzer-x86_64-pc-windows-msvc.zip",
      },
    ],
    tarball_url: "https://api.github.com/repos/chitsii/catalyzer/tarball/v0.1.0-alpha",
    zipball_url: "https://api.github.com/repos/chitsii/catalyzer/zipball/v0.1.0-alpha",
    body: "",
  },
  {
    url: "https://api.github.com/repos/chitsii/catalyzer/releases/159709985",
    assets_url: "https://api.github.com/repos/chitsii/catalyzer/releases/159709985/assets",
    upload_url: "https://uploads.github.com/repos/chitsii/catalyzer/releases/159709985/assets{?name,label}",
    html_url: "https://github.com/chitsii/catalyzer/releases/tag/v0.1.0-alpha",
    id: 159709985,
    author: {
      login: "chitsii",
      id: 59207213,
      node_id: "MDQ6VXNlcjU5MjA3MjEz",
      avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/chitsii",
      html_url: "https://github.com/chitsii",
      followers_url: "https://api.github.com/users/chitsii/followers",
      following_url: "https://api.github.com/users/chitsii/following{/other_user}",
      gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
      starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
      organizations_url: "https://api.github.com/users/chitsii/orgs",
      repos_url: "https://api.github.com/users/chitsii/repos",
      events_url: "https://api.github.com/users/chitsii/events{/privacy}",
      received_events_url: "https://api.github.com/users/chitsii/received_events",
      type: "User",
      site_admin: false,
    },
    node_id: "RE_kwDOMHUpKM4JhPsh",
    tag_name: "v0.1.0-alpha",
    target_commitish: "main",
    name: "v0.1.0-α",
    draft: false,
    prerelease: true,
    created_at: "2024-06-10T16:40:36Z",
    published_at: "2024-06-10T16:50:03Z",
    assets: [
      {
        url: "https://api.github.com/repos/chitsii/catalyzer/releases/assets/172978658",
        id: 172978658,
        node_id: "RA_kwDOMHUpKM4KT3Hi",
        name: "catalyzer-macos.zip",
        label: null,
        uploader: {
          login: "chitsii",
          id: 59207213,
          node_id: "MDQ6VXNlcjU5MjA3MjEz",
          avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/chitsii",
          html_url: "https://github.com/chitsii",
          followers_url: "https://api.github.com/users/chitsii/followers",
          following_url: "https://api.github.com/users/chitsii/following{/other_user}",
          gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
          starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
          subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
          organizations_url: "https://api.github.com/users/chitsii/orgs",
          repos_url: "https://api.github.com/users/chitsii/repos",
          events_url: "https://api.github.com/users/chitsii/events{/privacy}",
          received_events_url: "https://api.github.com/users/chitsii/received_events",
          type: "User",
          site_admin: false,
        },
        content_type: "application/zip",
        state: "uploaded",
        size: 6188021,
        download_count: 1,
        created_at: "2024-06-10T16:47:25Z",
        updated_at: "2024-06-10T16:47:28Z",
        browser_download_url: "https://github.com/chitsii/catalyzer/releases/download/v0.1.0-alpha/catalyzer-macos.zip",
      },
      {
        url: "https://api.github.com/repos/chitsii/catalyzer/releases/assets/172978723",
        id: 172978723,
        node_id: "RA_kwDOMHUpKM4KT3Ij",
        name: "catalyzer-x86_64-pc-windows-msvc.zip",
        label: null,
        uploader: {
          login: "chitsii",
          id: 59207213,
          node_id: "MDQ6VXNlcjU5MjA3MjEz",
          avatar_url: "https://avatars.githubusercontent.com/u/59207213?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/chitsii",
          html_url: "https://github.com/chitsii",
          followers_url: "https://api.github.com/users/chitsii/followers",
          following_url: "https://api.github.com/users/chitsii/following{/other_user}",
          gists_url: "https://api.github.com/users/chitsii/gists{/gist_id}",
          starred_url: "https://api.github.com/users/chitsii/starred{/owner}{/repo}",
          subscriptions_url: "https://api.github.com/users/chitsii/subscriptions",
          organizations_url: "https://api.github.com/users/chitsii/orgs",
          repos_url: "https://api.github.com/users/chitsii/repos",
          events_url: "https://api.github.com/users/chitsii/events{/privacy}",
          received_events_url: "https://api.github.com/users/chitsii/received_events",
          type: "User",
          site_admin: false,
        },
        content_type: "application/zip",
        state: "uploaded",
        size: 3793908,
        download_count: 5,
        created_at: "2024-06-10T16:48:09Z",
        updated_at: "2024-06-10T16:48:10Z",
        browser_download_url:
          "https://github.com/chitsii/catalyzer/releases/download/v0.1.0-alpha/catalyzer-x86_64-pc-windows-msvc.zip",
      },
    ],
    tarball_url: "https://api.github.com/repos/chitsii/catalyzer/tarball/v0.1.0-alpha",
    zipball_url: "https://api.github.com/repos/chitsii/catalyzer/zipball/v0.1.0-alpha",
    body: "",
  },
];

export default function Home() {
  return (
    <main>
      <Dashboard />
      <div className="border-2"></div>
    </main>
  );
}

export function Dashboard() {
  type props = {
    release: Release;
  };
  const ReleaseRow = ({ release }: props) => {
    return (
      <>
        <TableRow>
          <TableCell className="font-medium">{release.tag_name}</TableCell>
          <TableCell className="hidden md:table-cell">
            <Accordion type="single" collapsible className="m-0">
              <AccordionItem value="item-1">
                <AccordionTrigger className="h-8 text-xs">{"What's Changed?"}</AccordionTrigger>
                <AccordionContent className="text-xs">{release.body}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </TableCell>
          <TableCell>
            <GameDownloader release={release} />
          </TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4">
        <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <Tabs defaultValue="all">
            <div className="flex items-center space-x-2">
              <TabsList>
                <TabsTrigger value="all">Experimental</TabsTrigger>
                <TabsTrigger value="active">Stable</TabsTrigger>
              </TabsList>
              <Checkbox
                id="auto-create-profile"
                name="auto-create-profile"
                className="radio ml-4"
                defaultChecked={true}
              />
              <label htmlFor="auto-create-profile" className="text-sm">
                ダウンロード後に自動的にプロファイルを作成する
              </label>
            </div>
            <TabsContent value="all">
              <Card x-chunk="dashboard-06-chunk-0">
                {/* <CardHeader>
                  <CardTitle></CardTitle>
                  <CardDescription></CardDescription>
                </CardHeader> */}
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead className="hidden md:table-cell">Release Note</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dummy_data.map((release) => {
                        return <ReleaseRow key={release.id} release={release} />;
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
                {/* <CardFooter>
                </CardFooter> */}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
