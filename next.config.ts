import type { NextConfig } from "next";

// 本番ビルドではGitHub Codespaces等の開発用ワイルドカードドメインを
// Server Actionsのallowed origin(CSRF対策)に含めない。
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        ...(isDev ? ["*.app.github.dev"] : []),
      ],
    },
  },
};

export default nextConfig;
