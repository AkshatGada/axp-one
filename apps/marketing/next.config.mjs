/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@axp/design-system"],
  reactStrictMode: true,
  devIndicators: false,
  // `pnpm dev` serves from .next-dev (NEXT_DIST_DIR). `next build` with output: "export" always
  // compiles into .next (Next forces it, even with a custom distDir) and exports to out/, so a build
  // can never overwrite the dev server's files.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
