/** @type {import('next').NextConfig} */
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL ||
            (process.env.NODE_ENV === 'production'
                ? 'https://api-unbiased.adriancares.com'
                : 'http://localhost:3001'),
        NEXT_PUBLIC_SOCKET_SERVER_URL: process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ||
            (process.env.NODE_ENV === 'production'
                ? 'https://api-unbiased.adriancares.com'
                : 'http://localhost:3001'),
    },
    images: {
        // Next 16 blocks optimizing images from local IPs; the dev backend proxy runs on localhost
        dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
        // Use remotePatterns for flexible and efficient domain grouping
        remotePatterns: [
            // Backend domain (will be used for proxied images)
            {
                protocol: 'http',
                hostname: 'localhost'
            },
            {
                protocol: 'https',
                hostname: 'unbias.app'
            },
            {
                protocol: 'https',
                hostname: 'unbiased.adriancares.com'
            },
            {
                protocol: 'https',
                hostname: 'api-unbiased.adriancares.com'
            },
            // Picsum for development placeholder images
            {
                protocol: 'https',
                hostname: 'picsum.photos'
            },
            // Logo.dev for publication logos
            {
                protocol: 'https',
                hostname: 'img.logo.dev'
            }
        ]
    },
};

export default withNextIntl(nextConfig); 