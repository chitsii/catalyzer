"use client";

import React from "react";
import { fetch } from "@tauri-apps/plugin-http";
import { GithubRelease } from "@/lib/types/github-release";
import { Button } from "@/components/ui/button";

const fetchReleases = async (perPage: number = 2) => {
  const response = await fetch<GithubRelease[]>(
    `https://api.github.com/repos/CleverRaven/Cataclysm-DDA/releases?per_page=${perPage}&page=1`,
    {
      method: "GET",
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Catalyzer",
        // 'Authorization': `token ${process.env.GITHUB_TOKEN}`
      },
    },
  );
  return await response.data;
};

const CDDARleases = () => {
  const [releases, setReleases] = React.useState<GithubRelease[]>([]);

  console.log(releases); // Debug

  // useEffect(() => {
  //   fetchReleases()
  //     .then((data) => {
  //       setReleases(data);
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //     });
  // }, []);

  return (
    <>
      <Button
        onClick={() => {
          fetchReleases()
            .then((data) => {
              setReleases(data);
            })
            .catch((err) => {
              console.error(err);
            });
        }}
      >
        リロード
      </Button>
      <div className="grid gap-4">
        {releases?.map((r) => {
          return (
            <div key={r.id} className="grid gap-2">
              {/* <h2 className="font-bold text-lg">{r.id}</h2> */}
              {/* {
                Object.entries(r).map(([key, value]) => {
                  return (
                    <div key={key} className="grid gap-2">
                      <span className="text-sm font-semibold">{key}: </span>
                      <span className="text-sm">{JSON.stringify(value)}</span>
                    </div>
                  );
                })
              } */}
              <div>
                <h2 className="font-bold text-lg">{r.name}</h2>
                {/* <Badge>{r.published_at}</Badge> */}
                {/* <Badge>{r.tag_name}</Badge> */}
                <p className="text-xs whitespace-pre-line">{r.body}</p>
                <p className="text-xs whitespace-pre-line">{r.body?.replace(/\n+/g, "\n")}</p>

                {/* <p>{JSON.stringify(r.assets)}</p> */}
                {/* <p>published at {r.published_at}</p> */}
                {/* <a href={r.html_url} target="_blank" rel="noreferrer">Link</a> */}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
