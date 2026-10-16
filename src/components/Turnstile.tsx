"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

declare global {
    interface Window {
        turnstile?: {
            render: (el: HTMLElement, options: Record<string, unknown>) => string;
            remove: (widgetId: string) => void;
        };
    }
}

/**
 * Cloudflare Turnstile challenge. Reports a token when solved and null when it
 * expires or errors. Remount it (change its key) to get a fresh challenge.
 */
export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
    const container = useRef<HTMLDivElement>(null);
    const [scriptReady, setScriptReady] = useState(false);
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        if (!scriptReady || !container.current || !window.turnstile) return;
        const widgetId = window.turnstile.render(container.current, {
            sitekey: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY,
            theme: resolvedTheme === "light" ? "light" : "dark",
            callback: (token: string) => onToken(token),
            "expired-callback": () => onToken(null),
            "error-callback": () => onToken(null),
        });
        return () => window.turnstile?.remove(widgetId);
    }, [scriptReady, resolvedTheme, onToken]);

    return (
        <>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                onReady={() => setScriptReady(true)}
            />
            <div ref={container} />
        </>
    );
}
