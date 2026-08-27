import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the user's home directory makes Next infer the
  // workspace root as that directory, which widens module resolution and
  // filesystem watching to everything above the project. Pin it to this project.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
