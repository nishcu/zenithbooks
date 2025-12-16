
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
  experimental: {
    // Ensure proper client component handling
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    // Turbopack optimizations
    turbo: {
      rules: {},
    },
  },
  // Suppress Next.js 15 params warnings in logs
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  webpack: (config, { isServer }) => {
    // Ensure jsPDF and jspdf-autotable work in server-side
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
      // Don't externalize these packages - bundle them
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals = config.externals.filter(
          (external) => external !== 'jspdf' && external !== 'jspdf-autotable'
        );
      }
      
      // Handle pdf-parse worker files - mark them as external or ignore
      config.resolve.alias = {
        ...config.resolve.alias,
        // Prevent pdf-parse from trying to load worker files in Node.js
        'pdfjs-dist/build/pdf.worker': false,
      };
    }
    return config;
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
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
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
  }
};

export default nextConfig;
