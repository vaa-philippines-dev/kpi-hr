/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Type errors must be fixed before deploy; keep enforcement on in CI.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
