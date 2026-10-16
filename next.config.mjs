import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        // Article preview images come from any publisher; the optimizer fetches them
        // server-side (readers' browsers never contact the publisher) and refuses local IPs
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
            { protocol: 'http', hostname: '**' },
        ],
    },
};

export default withNextIntl(nextConfig);
