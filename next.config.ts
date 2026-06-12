import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js not to bundle these native packages — load them at runtime
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
