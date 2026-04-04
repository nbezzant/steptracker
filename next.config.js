/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://steptracker-prod.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

module.exports = nextConfig;