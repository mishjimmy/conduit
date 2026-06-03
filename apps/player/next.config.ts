import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(process.cwd(), "../..");

// Load monorepo-root env so a single root .env.local feeds every app.
loadEnv({ path: [path.join(workspaceRoot, ".env.local"), path.join(workspaceRoot, ".env")] });

const nextConfig: NextConfig = {
  transpilePackages: ["@conduit/ui", "@conduit/types"],
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
};

export default nextConfig;
