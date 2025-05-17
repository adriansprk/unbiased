import '@/app/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { ToastProvider } from "@/components/ui/toast-manager";
import { Footer } from '@/components/Footer';
import { locales } from '@/i18n/routing';
import { getMessages, setRequestLocale } from 'next-intl/server';

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

type Locale = (typeof locales)[number];

// Generate static params for all supported locales
export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params;

    // Validate that the incoming locale is supported
    if (!locales.includes(locale as Locale)) {
        notFound();
    }

    // Load messages directly
    const messages = (await import(`../../messages/${locale}`)).default;
    const metadata = messages.Metadata;

    return {
        title: metadata.title,
        description: metadata.description,
        keywords: metadata.keywords,
        authors: [{ name: "Adrian Cares" }],
        metadataBase: new URL('https://unbiased.adriancares.com'),
        alternates: {
            canonical: '/',
            languages: {
                'en': '/en',
                'de': '/de',
            },
        },
        openGraph: {
            type: "website",
            title: metadata.ogTitle,
            description: metadata.ogDescription,
            siteName: "Unbias",
            url: "https://unbiased.adriancares.com/",
            images: [
                {
                    url: "/images/social/og-unbias-preview.png",
                    width: 1200,
                    height: 630,
                    alt: "Unbias - AI-Powered Insight to Decode News Articles",
                },
            ],
            locale,
        },
        twitter: {
            card: "summary_large_image",
            title: metadata.twitterTitle,
            description: metadata.twitterDescription,
            images: [
                {
                    url: "/images/social/og-unbias-preview.png",
                    alt: "Unbias: AI-Powered News Decoding and Analysis",
                },
            ],
        },
        icons: {
            icon: [
                { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
                { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
                { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
            ],
            apple: [
                { url: '/apple-icon-57x57.png', sizes: '57x57', type: 'image/png' },
                { url: '/apple-icon-60x60.png', sizes: '60x60', type: 'image/png' },
                { url: '/apple-icon-72x72.png', sizes: '72x72', type: 'image/png' },
                { url: '/apple-icon-76x76.png', sizes: '76x76', type: 'image/png' },
                { url: '/apple-icon-114x114.png', sizes: '114x114', type: 'image/png' },
                { url: '/apple-icon-120x120.png', sizes: '120x120', type: 'image/png' },
                { url: '/apple-icon-144x144.png', sizes: '144x144', type: 'image/png' },
                { url: '/apple-icon-152x152.png', sizes: '152x152', type: 'image/png' },
                { url: '/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' },
            ],
            other: [
                { rel: 'apple-icon-precomposed', url: '/apple-icon-precomposed.png' },
                { rel: 'manifest', url: '/site.webmanifest' },
                { rel: 'msapplication-config', url: '/browserconfig.xml' },
            ],
        },
    };
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Validate that the incoming locale is supported
    if (!locales.includes(locale as Locale)) {
        notFound();
    }

    // Enable static rendering
    setRequestLocale(locale as Locale);

    // Load the messages for the requested locale
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <meta name="msapplication-TileColor" content="#ffffff" />
                <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="theme-color" content="oklch(1 0 0)" />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background flex flex-col`}
            >
                <NextIntlClientProvider locale={locale as Locale} messages={messages}>
                    <ThemeProvider>
                        <ToastProvider>
                            <div className="flex-1">
                                {children}
                            </div>
                            <Footer />
                        </ToastProvider>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
} 