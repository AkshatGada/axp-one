/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@axp/design-system"],
  reactStrictMode: true,
  // `pnpm build` exports into .next-build (moved to out/), so it never touches dev's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
