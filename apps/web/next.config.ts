import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["motion", "@radix-ui/react-dialog", "cmdk"],
  },
};

export default config;
