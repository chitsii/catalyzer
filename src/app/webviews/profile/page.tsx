"use client";

import { useEffect, useState, useRef } from "react";
import { popUp } from "@/lib/utils";
import { debug, info, warn } from "@tauri-apps/plugin-log";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import ProgressButton from "@/components/progress-button/progress-button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { download } from "@tauri-apps/plugin-upload";

import {
  unzipArchive,
  getSettings,
  addProfile,
  invoke_safe,
  getPlatform,
  cddaStableReleases,
  cddaPullRebase,
  isCddaCloned,
  cddaLatestReleases,
  editProfile,
} from "@/lib/api";

type Release = {
  tag_name: string;
  browser_url: string;
  download_url: string;
};

const LatestReleaseGetter = () => {
  const [releases, setReleases] = useState<Release[]>([]);

  return (
    <>
      <Button
        onClick={async () => {
          const res = await invoke_safe<Release[]>("cdda_get_latest_releases", { num: 5 });
          setReleases([...res]);
        }}
      >
        get latest releases
      </Button>
      <div>{JSON.stringify(releases)}</div>
    </>
  );
};

const StableReleaseGetter = () => {
  const [releases, setReleases] = useState<Release[]>([]);

  return (
    <>
      <Button
        onClick={async () => {
          const res = await invoke_safe<Release[]>("cdda_get_stable_releases", {});
          setReleases([...res]);
        }}
      >
        get stable releases
      </Button>
      <div>{JSON.stringify(releases)}</div>
    </>
  );
};

const RateLimitWidget = () => {
  const [remain, setRemain] = useState<number | null>(null);

  const fetchRateLimit = async () => {
    const res = await invoke_safe<number>("github_rate_limit", {});
    setRemain(res);
  };

  return (
    <>
      <Button onClick={() => fetchRateLimit()}>refresh</Button>
      <div>
        <div>Rate Limit: {remain}</div>
      </div>
    </>
  );
};

import path from "path";

type DownloaderProps = {
  release: Release;
};
const GameDownloader = ({ release }: DownloaderProps) => {
  const [manualProgress, setManualProgress] = useState<number>(0);
  const download_url = release.download_url;

  info(`${manualProgress}`);

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

    let receivedLength = 0;
    await download(download_url, download_save_path, ({ progress, total }) => {
      setManualProgress((prev) => {
        receivedLength += progress;
        // info(`receivedLength: ${receivedLength} total: ${total}`);
        info(`manual progress: ${manualProgress}`);
        // return Math.ceil((progress / total) * 100);
        return Math.ceil((receivedLength / total) * 50);
      });
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
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <ProgressButton
        label="プロファイルを作る"
        progressType="manual"
        progress={manualProgress}
        successColorClass="teal-500"
        onClick={downlaod_then_extract}
        onComplete={() => {}}
        onError={(error) => {
          warn(JSON.stringify(error));
        }}
      />
    </div>
  );
};

const dummy_data: Release[] = [
  {
    tag_name: "v0.1.0-alpha2",
    download_url: "https://github.com/chitsii/catalyzer/releases/download/v0.1.0-alpha2/catalyzer-macos_aarch64.zip",
    browser_url: "https://github.com/chitsii/catalyzer/releases/tag/v0.1.0-alpha2",
  },
  {
    tag_name: "v0.1.0-alpha",
    browser_url: "https://github.com/chitsii/catalyzer/releases/tag/v0.1.0-alpha",
    download_url: "https://github.com/chitsii/catalyzer/releases/download/v0.1.0-alpha/catalyzer-macos.zip",
  },
];

export default function Home() {
  return (
    <main>
      <StableReleaseGetter />
      <br />
      <RateLimitWidget />
      <br />
      <LatestReleaseGetter />
      <br />
      <Dashboard />
      <div className="border-2"></div>
    </main>
  );
}

class APICaller {
  private minInterval: number = 60 * 5;
  private lastCallTime: number | null;
  public latestReleasesCache: Release[] = [];
  public stableReleasesCache: Release[] = [];

  constructor() {
    this.lastCallTime = null;
  }
  public async getStableRelease(): Promise<Release[]> {
    const currentTime = Date.now();

    if (this.lastCallTime !== null) {
      const timeSinceLastCall = (currentTime - this.lastCallTime) / 1000;
      // Rate Limit対策
      if (timeSinceLastCall < this.minInterval) {
        info(
          `API call canceled.Wait ${(this.minInterval - timeSinceLastCall).toFixed(2)} seconds before trying again.`,
        );
        return Promise.resolve(this.stableReleasesCache);
      }
    }
    this.lastCallTime = currentTime;
    const res = (await cddaStableReleases()) as Release[];
    this.stableReleasesCache = res;
    return Promise.resolve(this.stableReleasesCache);
  }
}
const cached_api = new APICaller();

function Dashboard() {
  const [stableReleases, setStableReleases] = useState<Release[]>([]);
  const [latestReleases, setLatestReleases] = useState<Release[]>([]);

  const handleGetStableReleases = async () => {
    cached_api.getStableRelease().then((res) => {
      setStableReleases(res);
    });
  };

  const ReleaseRow = ({ release }: { release: Release }) => {
    return (
      <>
        <TableRow>
          <TableCell className="font-medium">{release.tag_name}</TableCell>
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
                <TabsTrigger value="latest">Latest</TabsTrigger>
                <TabsTrigger
                  value="stable"
                  onClick={() => {
                    handleGetStableReleases();
                  }}
                >
                  Stable
                </TabsTrigger>
              </TabsList>
              {/* <Checkbox
                id="auto-create-profile"
                name="auto-create-profile"
                className="radio ml-4"
                defaultChecked={true}
              />
              <label htmlFor="auto-create-profile" className="text-sm">
                ダウンロード後に自動的にプロファイルを作成する
              </label> */}
            </div>
            <TabsContent value="latest">
              <Card x-chunk="dashboard-06-chunk-0">
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dummy_data.map((release) => {
                        return <ReleaseRow key={release.tag_name} release={release} />;
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
                {/* <CardFooter>
                </CardFooter> */}
              </Card>
            </TabsContent>
            <TabsContent value="stable">
              <Card x-chunk="dashboard-06-chunk-0">
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stableReleases.map((release) => {
                        return <ReleaseRow key={release.tag_name} release={release} />;
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
