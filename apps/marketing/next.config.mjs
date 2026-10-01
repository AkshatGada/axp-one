/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@axp/design-system"],
  reactStrictMode: true,
  // A separate build dir lets `pnpm build` run while `pnpm dev` keeps serving (.next).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
