"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() => {
        setMounted(true);
    }, []);

    // Render a placeholder button with the same dimensions to prevent layout shift
    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="w-9 px-0"
                aria-hidden="true"
            >
                <div className="h-[1.2rem] w-[1.2rem]" />
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
            className="w-9 px-0"
        >
            {resolvedTheme === "light" ? (
                <SunIcon className="h-[1.2rem] w-[1.2rem]" />
            ) : (
                <MoonIcon className="h-[1.2rem] w-[1.2rem]" />
            )}
        </Button>
    );
}

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
        </svg>
    );
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
    );
} 