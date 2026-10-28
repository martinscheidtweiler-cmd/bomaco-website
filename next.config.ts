import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [{
        source: "/lot/live/:token",
        has: [{ type: "query", key: "site", value: "auction" }],
        destination: "/lot/live/:token/auction",
      }],
    };
  },
};

export default nextConfig;
