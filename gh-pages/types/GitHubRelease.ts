type GitHubRelease = {
	tag_name?: string;
	assets?: { name: string; browser_download_url: string }[];
};

export type { GitHubRelease as default };
