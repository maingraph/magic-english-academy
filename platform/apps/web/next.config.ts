import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  async rewrites() {
    const apiOrigin = process.env.API_PROXY_URL;

    return apiOrigin
      ? [
          {
            source: "/api/:path*",
            destination: `${apiOrigin.replace(/\/$/, "")}/api/:path*`
          }
        ]
      : [];
  },
  turbopack: {
    root: path.resolve(__dirname, "../..")
  }
};

export default nextConfig;
