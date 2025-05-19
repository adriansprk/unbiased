"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast-manager";
import logger from "@/utils/logger";

interface ShareableLinkProps {
    jobId: string;
}

const ShareableLink: React.FC<ShareableLinkProps> = ({ jobId }) => {
    const locale = useLocale();
    const t = useTranslations("Common");
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);

    // Generate the shareable URL with the correct path format to avoid locale duplication
    const baseUrl = "https://unbiased.adriancares.com";
    const shareableUrl = `${baseUrl}/${locale}/analysis/${jobId}`;

    // Handle copy button click
    const handleCopyClick = async () => {
        try {
            await navigator.clipboard.writeText(shareableUrl);
            setCopied(true);
            showToast(t("copied"), { type: "success", duration: 2000 });
        } catch (error) {
            logger.error("Failed to copy link:", error);
            showToast(t("failedToCopyLink"), { type: "error", duration: 3000 });
        }
    };

    // Reset copied state after 2 seconds
    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => {
                setCopied(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    return (
        <div className="bg-card p-4 rounded-lg border border-border mt-4">
            <h3 className="text-lg font-semibold mb-2">
                {t("shareThisAnalysis")}
            </h3>

            <div className="relative">
                <div className="flex-grow bg-background rounded-md border border-border p-2 text-sm pr-24 truncate overflow-hidden">
                    {shareableUrl}
                </div>
                <button
                    onClick={handleCopyClick}
                    className="absolute right-1 top-1 bottom-1 flex items-center justify-center gap-1.5 rounded-md px-3 border border-border bg-background hover:bg-muted transition-colors"
                    aria-label={copied ? t("copied") : t("copy")}
                >
                    {copied ? (
                        <>
                            <Check className="h-4 w-4" />
                            <span className="text-sm">{t("copied")}</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-4 w-4" />
                            <span className="text-sm">{t("copy")}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ShareableLink; 