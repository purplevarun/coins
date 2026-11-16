import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL(".", import.meta.url).pathname;
const DIST = join(ROOT, "dist");

const repository = process.env.GITHUB_REPOSITORY ?? "purplevarun/coins";
const repoUrl = `https://github.com/${repository}`;
const releasesUrl = `${repoUrl}/releases`;

let downloadUrl = `${releasesUrl}/latest`;
let version = "";
try {
	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"User-Agent": "purplecoins-pages",
	};
	if (process.env.GH_TOKEN)
		headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
	const response = await fetch(
		`https://api.github.com/repos/${repository}/releases/latest`,
		{ headers },
	);
	if (response.ok) {
		const release = (await response.json()) as {
			tag_name?: string;
			assets?: { name: string; browser_download_url: string }[];
		};
		const apk = release.assets?.find((asset) =>
			asset.name.endsWith(".apk"),
		);
		if (apk) downloadUrl = apk.browser_download_url;
		if (release.tag_name) version = `(${release.tag_name})`;
	}
} catch {
	// Fall back to the releases page when the API is unavailable.
}

const html = (await readFile(join(ROOT, "index.html"), "utf8"))
	.replaceAll("{{DOWNLOAD_URL}}", downloadUrl)
	.replaceAll("{{VERSION}}", version)
	.replaceAll("{{RELEASES_URL}}", releasesUrl)
	.replaceAll("{{REPO_URL}}", repoUrl);

await mkdir(DIST, { recursive: true });
await writeFile(join(DIST, "index.html"), html);
await cp(join(ROOT, "icon.svg"), join(DIST, "icon.svg"));
await cp(join(ROOT, ".nojekyll"), join(DIST, ".nojekyll"));

console.log(`Site built → ${DIST}`);
console.log(`Download URL: ${downloadUrl}`);
