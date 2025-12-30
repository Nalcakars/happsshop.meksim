import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.happsplan.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
