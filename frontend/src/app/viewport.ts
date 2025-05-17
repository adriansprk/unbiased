import { type Viewport } from "next";

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "oklch(1 0 0)" },
        { media: "(prefers-color-scheme: dark)", color: "oklch(0.2 0 0)" },
    ],
    width: "device-width",
    initialScale: 1,
    minimumScale: 1,
    maximumScale: 5,
    userScalable: true, // Allow users to zoom for accessibility
    viewportFit: "cover", // Ensures content extends to the edges on notched devices
    colorScheme: 'dark light' // Support both color schemes
} 