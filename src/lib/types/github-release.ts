export type GithubReleaseAuthor = {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    url: string;
    html_url: string;
    type: string;
};

export type GithubReleaseAsset = {
    url: string;
    id: number;
    node_id: string;
    name: string;
    label: string | null;
    content_type: string;
    state: string;
    size: number;
    download_count: number;
    created_at: string;
    updated_at: string;
    browser_download_url: string;
    uploader: GithubReleaseAuthor;
};

export type GithubRelease = {
    assets_url: string;
    upload_url: string;
    tarball_url: string | null;
    zipball_url: string | null;
    created_at: string;
    published_at: string | null;
    draft: boolean;
    id: number;
    node_id: string;
    author: GithubReleaseAuthor;
    html_url: string;
    name: string | null;
    prerelease: boolean;
    tag_name: string;
    target_commitish: string;
    assets: GithubReleaseAsset[];
    url: string;
    body?: string;
};