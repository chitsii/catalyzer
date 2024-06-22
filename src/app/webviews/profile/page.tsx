"use client";

import { useEffect, useState } from "react";
import { info, warn } from "@tauri-apps/plugin-log";

import Link from "next/link";
import ProgressButton from "@/components/progress-button/progress-button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import { download } from "@tauri-apps/plugin-upload";

import {
  unzipArchive,
  addProfile,
  invoke_safe,
  getPlatform,
  cddaStableReleases,
  editProfile,
  cddaLatestReleases,
  removeProfile,
} from "@/lib/api";

import path from "path";
import { listen } from "@tauri-apps/api/event";
import { popUp } from "@/lib/utils";
import { UpdateIcon } from "@radix-ui/react-icons";

// const LatestReleaseGetter = () => {
//   const [releases, setReleases] = useState<Release[]>([]);

//   return (
//     <>
//       <Button
//         onClick={async () => {
//           const res = await invoke_safe<Release[]>("cdda_get_latest_releases", { num: 5 });
//           setReleases([...res]);
//         }}
//       >
//         get latest releases
//       </Button>
//       <div>{JSON.stringify(releases)}</div>
//     </>
//   );
// };

// const StableReleaseGetter = () => {
//   const [releases, setReleases] = useState<Release[]>([]);

//   return (
//     <>
//       <Button
//         onClick={async () => {
//           const res = await invoke_safe<Release[]>("cdda_get_stable_releases", {});
//           setReleases([...res]);
//         }}
//       >
//         get stable releases
//       </Button>
//       <div>{JSON.stringify(releases)}</div>
//     </>
//   );
// };

// const RateLimitWidget = () => {
//   const [remain, setRemain] = useState<number | null>(null);

//   const fetchRateLimit = async () => {
//     const res = await invoke_safe<number>("github_rate_limit", {});
//     setRemain(res);
//   };

//   return (
//     <>
//       <Button onClick={() => fetchRateLimit()}>refresh</Button>
//       <div>
//         <div>Rate Limit: {remain}</div>
//       </div>
//     </>
//   );
// };

type Release = {
  tag_name: string;
  browser_url: string;
  download_url: string;
};

type DownloaderProps = {
  release: Release;
};
const GameDownloader = ({ release }: DownloaderProps) => {
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [extractProgress, setExtractProgress] = useState<number>(0);

  const download_url = release.download_url;

  info(`download: ${downloadProgress}%`);

  const downlaod_then_extract = async () => {
    const new_profile = await addProfile(release.tag_name);
    info(`created new profile ${JSON.stringify(new_profile)}`);
    const fname = path.basename(download_url);
    const download_save_path = path.join(new_profile.profile_path.root, fname);
    const extract_dir = path.join(new_profile.profile_path.root, "game");
    info(`
      download_url: ${download_url}
      fname: ${fname}
      downlaod_save_path: ${download_save_path}
      extract_dir: ${extract_dir}
    `);

    try {
      let receivedLength = 0;
      await download(download_url, download_save_path, ({ progress, total }) => {
        setDownloadProgress(() => {
          receivedLength += progress;
          return Math.ceil((receivedLength / total) * 50);
        });
      });

      if (receivedLength <= 1024 * 1024 * 10) {
        popUp("failed", "このバージョンのビルドがまだ存在しないかもしれません。URLから確認してみてください。");
        removeProfile(new_profile.id);
        return;
      }

      type Payload = { percent: number };
      const unlisten = await listen<Payload>("EXTRACT_PROGRESS", (e) => {
        let progress = e.payload.percent;
        info(`extract progress: ${progress}`);
        setExtractProgress(progress);
      });
      if (download_url.endsWith(".zip")) {
        await unzipArchive(download_save_path, extract_dir);
      } else if (download_url.endsWith(".dmg")) {
        await invoke_safe("extract_dmg", {
          sourceDmg: download_save_path,
          targetDir: extract_dir,
        });
      }

      info(`extracted to ${extract_dir} `);
      // TODO: game path探し方をbackendに移動
      const platform = await getPlatform();
      let game_path =
        {
          windows: path.join(extract_dir, "cataclysm-tiles.exe"),
          macos: path.join(extract_dir, "Cataclysm.app"),
        }[platform] || null;
      await editProfile(new_profile.id, new_profile.name, game_path);
      unlisten();
    } catch (error) {
      warn(JSON.stringify(error));
      popUp("failed", "ダウンロードまたは解凍に失敗しました。");
      removeProfile(new_profile.id);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center">
      {!!release.download_url ? (
        <ProgressButton
          label="プロファイルを作る"
          progressType="manual"
          download_progress={downloadProgress}
          extract_progress={extractProgress}
          successColorClass="teal-500"
          onClick={downlaod_then_extract}
          onCompleteDownload={() => {}}
          onCompleteExtract={() => {}}
          onError={(error) => {
            warn(JSON.stringify(error));
          }}
        />
      ) : (
        <>
          <div>ダウンロードURLが見つかりません</div>
        </>
      )}
    </div>
  );
};

export default function Home() {
  return (
    <main>
      <div className="flex justify-center items-center min-h-screen">
        <Dashboard />
      </div>
    </main>
  );
}

class ApiCaller {
  private minInterval: number = 60 * 5;
  private lastCallTime: number | null;
  public latestReleasesCache: Release[] = [];
  public stableReleasesCache: Release[] = [];

  constructor() {
    this.lastCallTime = null;
  }
  public async getStableRelease(): Promise<Release[]> {
    // Rate Limit対策
    const currentTime = Date.now();
    if (this.lastCallTime !== null) {
      const timeSinceLastCall = (currentTime - this.lastCallTime) / 1000;
      if (timeSinceLastCall < this.minInterval) {
        info(
          `API call canceled.Wait ${(this.minInterval - timeSinceLastCall).toFixed(2)} seconds before trying again.`,
        );
        return Promise.resolve(this.stableReleasesCache);
      }
    }
    this.lastCallTime = currentTime;
    const res = (await cddaStableReleases(5)) as Release[];
    this.stableReleasesCache = res;
    return Promise.resolve(this.stableReleasesCache);
  }
  public async getLatestRelease(): Promise<Release[]> {
    // Latest ReleaseはGithub APIを呼ばないのでRate Limitの制限はない
    const res = (await cddaLatestReleases(10)) as Release[];
    this.latestReleasesCache = res;
    return Promise.resolve(this.latestReleasesCache);
  }
}
const cached_api = new ApiCaller();

function Dashboard() {
  const [stableReleases, setStableReleases] = useState<Release[]>([]);
  const [latestReleases, setLatestReleases] = useState<Release[]>([]);

  const handleGetStableReleases = async () => {
    cached_api.getStableRelease().then((res) => {
      setStableReleases(res);
    });
  };

  const handleGetLatestReleases = async () => {
    cached_api.getLatestRelease().then((res) => {
      setLatestReleases(res);
    });
  };

  const ReleaseRow = ({ release }: { release: Release }) => {
    return (
      <>
        <TableRow>
          <TableCell className="font-medium">
            <Link
              href={release.browser_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-foreground hover:underline"
            >
              {release.tag_name}
            </Link>
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
                <TabsTrigger
                  value="latest"
                  onClick={() => {
                    handleGetLatestReleases();
                  }}
                  className="flex items-center gap-2"
                >
                  <UpdateIcon />
                  Latest
                </TabsTrigger>
                <TabsTrigger
                  value="stable"
                  onClick={() => {
                    handleGetStableReleases();
                  }}
                  className="flex items-center gap-2"
                >
                  <UpdateIcon />
                  Stable
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="latest">
              <Card>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <ScrollArea className="h-[250px]">
                        {latestReleases.map((release) => {
                          return <ReleaseRow key={release.tag_name} release={release} />;
                        })}
                      </ScrollArea>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="stable">
              <Card>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <ScrollArea className="h-[200px]">
                        {stableReleases.map((release) => {
                          return <ReleaseRow key={release.tag_name} release={release} />;
                        })}
                      </ScrollArea>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
