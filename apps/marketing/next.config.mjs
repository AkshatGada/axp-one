/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@axp/design-system"],
  reactStrictMode: true,
  devIndicators: false,
  // Always build with NEXT_DIST_DIR=.next-build (see package.json): the export never touches the .next
  // that `pnpm dev` serves from. It is moved to out/ afterwards.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
