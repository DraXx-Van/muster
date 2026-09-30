import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md is our own shared rules file; don't let Next append to it.
  agentRules: false,
} as NextConfig;

export default nextConfig;
