/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  experimental: {
    serverComponentsExternalPackages: ["yahoo-finance2"],
  },
};

export default nextConfig;