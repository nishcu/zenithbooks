
// Force a clean build at a new timestamp: 1718804400
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'inline',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/invoices',
        destination: '/billing/invoices',
        permanent: true,
      },
       {
        source: '/invoices/new',
        destination: '/billing/invoices/new',
        permanent: true,
      },
    ]
  },
  devIndicators: {
    allowedDevOrigins: [
        "https://3000-firebase-studio-1758117972407.cluster-qxqlf3vb3nbf2r42l5qfoebdry.cloudworkstations.dev",
        "https://zenithbooks.in"
    ]
  }
};

export default nextConfig;
