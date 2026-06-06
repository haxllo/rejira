import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["motion", "@radix-ui/react-dialog", "cmdk"],
    turbopack: {
      root: process.cwd(),
    },
  },
};

export default config;
