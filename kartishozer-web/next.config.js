// GITHUB_PAGES=true switches this to a static export under the /kartishozer
// base path, used only by the CI preview deploy to GitHub Pages. Normal
// `next dev` / `next build` (no env var) behave exactly as before —
// this does not change the app's design or functionality.
const isGithubPagesExport = process.env.GITHUB_PAGES === "true";
const repoBasePath = "/kartishozer";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isGithubPagesExport && {
    output: "export",
    basePath: repoBasePath,
    assetPrefix: repoBasePath,
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

module.exports = nextConfig;
