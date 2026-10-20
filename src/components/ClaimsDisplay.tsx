"use client";

import React from 'react';
import type { AnalysisView } from '@/server/analysis';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

const ClaimsDisplay: React.FC<{ claims: AnalysisView['claims'] }> = ({ claims }) => {
    const t = useTranslations('ClaimsDisplay');
    const tCommon = useTranslations('Common');

    return (
        <div>
            <h2 className="text-3xl font-semibold tracking-tight">{tCommon('factualClaims')}</h2>
            {claims.length === 0 ? (
                <p className="mt-2 text-muted-foreground">{t('noClaims')}</p>
            ) : (
                <>
                    <p className="mt-2 text-muted-foreground">{t('intro')}</p>
                    <ol className="mt-4 divide-y rounded-lg border">
                        {claims.map((claim, index) => (
                            <li key={index} data-testid={`claim-${index}`}>
                                <details className="group">
                                    <summary className="flex cursor-pointer list-none gap-3 p-4 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                                        <span className="mt-0.5 w-5 shrink-0 text-sm tabular-nums text-muted-foreground">{index + 1}.</span>
                                        <span className="flex-1">
                                            {claim.topic && <span className="block font-medium">{claim.topic}</span>}
                                            <span className="block text-sm text-muted-foreground leading-relaxed">{claim.statement}</span>
                                        </span>
                                        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                                    </summary>
                                    <div className="space-y-3 px-4 pb-4 pl-12 text-sm leading-relaxed">
                                        {claim.quote && (
                                            <blockquote className="border-l-2 border-highlight pl-4">
                                                <span className="sr-only">{t('inArticle')}: </span>
                                                {claim.quote}
                                            </blockquote>
                                        )}
                                        {claim.significance && (
                                            <p>
                                                <span className="font-medium">{t('significance')}</span> {claim.significance}
                                            </p>
                                        )}
                                    </div>
                                </details>
                            </li>
                        ))}
                    </ol>
                </>
            )}
        </div>
    );
};

export default ClaimsDisplay;
