/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@axp/design-system"],
  reactStrictMode: true,
};
export default nextConfig;
