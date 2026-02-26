import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  },
};

export default nextConfig;
