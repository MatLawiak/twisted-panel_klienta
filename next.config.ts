import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Statyczny eksport tylko w buildzie produkcyjnym (deploy na CyberFolks)
  // W trybie dev używamy normalnego routera Next.js
  ...(isProd && {
    output: "export" as const,
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
