/** Static export for GitHub Pages. BASE_PATH is the repository path (e.g. "/when-coordination-pays") when the site
 *  is served from <user>.github.io/<repo>; empty for a local build. externalDir lets pages import the experiment
 *  summaries in ../data/site and the docs in ../docs at build time. */
const basePath = process.env.BASE_PATH || "";

const nextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  experimental: { externalDir: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
export default nextConfig;
