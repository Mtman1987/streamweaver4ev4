/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

module.exports = nextConfig