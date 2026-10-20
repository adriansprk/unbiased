"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link2, Check } from "lucide-react";
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

    const shareableUrl = `https://unbiased.adriancares.com/${locale}/analysis/${jobId}`;

    const handleCopyClick = async () => {
        try {
            await navigator.clipboard.writeText(shareableUrl);
            setCopied(true);
            showToast(t("linkCopiedToClipboard"), { type: "success", duration: 2000 });
        } catch (error) {
            logger.error("Failed to copy link:", error);
            showToast(t("failedToCopyLink"), { type: "error", duration: 3000 });
        }
    };

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(timer);
    }, [copied]);

    return (
        <button
            type="button"
            onClick={handleCopyClick}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            <span aria-live="polite">{copied ? t("copied") : t("copyLink")}</span>
        </button>
    );
};

export default ShareableLink;
