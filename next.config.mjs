/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: guarantees "no backend". `npm run build` emits ./out.
  // Vercel deploys this as a static site with zero config.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
