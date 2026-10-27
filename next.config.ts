import type { NextConfig } from "next";
import createMDX from "@next/mdx";

// Who may frame the embeds (trypane.app's canvas), plus local development.
const FRAME_ANCESTORS = "'self' https://trypane.app https://*.trypane.app http://localhost:* http://127.0.0.1:*";

const nextConfig: NextConfig = {
  cacheComponents: true,
  headers: async () => [
    {
      source: "/embed/:slug",
      headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${FRAME_ANCESTORS}` }],
    },
  ],
  partialPrefetching: true,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
