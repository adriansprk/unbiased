"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Turnstile from "@/components/Turnstile";
import { useRouter } from "@/i18n/navigation";

// Local development runs without the Turnstile widget; the server accepts missing tokens there
const needsTurnstile = process.env.NODE_ENV !== "development";

/**
 * URL form: starts (or reuses) an analysis and opens its result page.
 */
export default function AnalyzeForm() {
    const t = useTranslations("UrlInput");
    const locale = useLocale();
    const router = useRouter();

    const [token, setToken] = useState<string | null>(null);
    // Turnstile tokens are single-use: bump the key to remount the widget after a failed attempt
    const [challengeKey, setChallengeKey] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fail = (message: string) => {
        setError(message);
        setSubmitting(false);
        setToken(null);
        setChallengeKey(key => key + 1);
    };

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Read from the form, not React state: input typed before hydration still counts
        const url = String(new FormData(event.currentTarget).get("url") ?? "").trim();
        if (needsTurnstile && !token) {
            setError(t("verificationRequired"));
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, language: locale, turnstileToken: token ?? undefined }),
            });
            const body = (await res.json().catch(() => ({}))) as { id?: string };
            if (!res.ok || !body.id) {
                fail(res.status === 400 ? t("invalidUrl") : res.status === 403 ? t("verificationFailed") : t("submitError"));
                return;
            }
            router.push(`/analysis/${body.id}`);
        } catch {
            fail(t("submitError"));
        }
    };

    return (
        <form onSubmit={onSubmit} className="w-full max-w-3xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
                <Input
                    type="url"
                    name="url"
                    required
                    placeholder={t("placeholder")}
                    aria-label={t("placeholder")}
                    disabled={submitting}
                    className="flex-grow"
                />
                <Button
                    type="submit"
                    disabled={submitting || (needsTurnstile && !token)}
                    className="whitespace-nowrap min-w-[180px]"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("analyzing")}
                        </>
                    ) : (
                        t("submit")
                    )}
                </Button>
            </div>

            {needsTurnstile && (
                <div className="py-2">
                    <Turnstile key={challengeKey} onToken={setToken} />
                </div>
            )}

            {error && (
                <div className="text-red-600 dark:text-red-400 text-sm" role="alert">
                    {error}
                </div>
            )}
        </form>
    );
}
