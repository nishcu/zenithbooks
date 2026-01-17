
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
  // Avoid dev-time cross-origin issues when accessing from LAN IP (Next.js 15+)
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.4:3000",
  ],
  experimental: {
    // Ensure proper client component handling
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  webpack: (config, { isServer }) => {
    // Suppress webpack warnings for pdf-parse dynamic requires
    // This is a known issue with pdf-parse using dynamic requires internally
    // The library works correctly, but webpack warns about it
    if (config.ignoreWarnings === undefined) {
      config.ignoreWarnings = [];
    }
    
    // Add regex patterns to ignore pdf-parse warnings
    config.ignoreWarnings.push(
      /pdf-parse/,
      /pdfjs-dist/,
      /Critical dependency: the request of a dependency is an expression/
    );

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
      
      // Suppress pdf-parse dynamic require warnings via module rules
      config.module = config.module || {};
      config.module.exprContextCritical = false;
      config.module.unknownContextCritical = false;
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
