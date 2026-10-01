/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@axp/design-system"],
  reactStrictMode: true,
  devIndicators: false,
  ...(basePath ? { basePath } : {}),
  // A separate build directory lets `next build` run while `next dev` is up.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
