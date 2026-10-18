"use client";

import React from 'react';
import type { AnalysisView } from '@/server/analysis';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTranslations } from 'next-intl';

const ClaimsDisplay: React.FC<{ claims: AnalysisView['claims'] }> = ({ claims }) => {
    const t = useTranslations('ClaimsDisplay');
    const tCommon = useTranslations('Common');

    if (claims.length === 0) {
        return (
            <div className="p-4 text-center">
                <p className="text-muted-foreground">{t('noClaims')}</p>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">{tCommon('factualClaims')}</h3>
            <Accordion type="multiple" className="space-y-3">
                {claims.map((claim, index) => (
                    <AccordionItem
                        key={index}
                        value={`claim-${index}`}
                        data-testid={`claim-${index}`}
                        className="border rounded-lg overflow-hidden"
                    >
                        <AccordionTrigger className="hover:no-underline px-4 py-3">
                            <div className="flex items-center text-left w-full">
                                <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 mr-3 font-medium text-sm self-center">
                                    {index + 1}
                                </div>
                                <div className="flex flex-col items-start">
                                    {claim.topic && <h4 className="font-semibold text-md mb-1">{claim.topic}</h4>}
                                    <p className="text-sm text-muted-foreground">{claim.statement}</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-3 pt-0 space-y-4 text-sm border-t border-border bg-muted/20">
                            {claim.quote && (
                                <div className="bg-muted p-4 my-3 rounded-md border-l-4 border-slate-300 italic">
                                    <p className="not-italic font-medium text-xs mb-2 text-muted-foreground">{tCommon('source')}</p>
                                    <p className="text-sm leading-relaxed">{claim.quote}</p>
                                </div>
                            )}
                            {claim.significance && (
                                <div className="px-1 py-2">
                                    <div className="flex items-baseline">
                                        <span className="font-medium text-xs text-muted-foreground mr-2">{t('significance')}</span>
                                        <p className="text-sm">{claim.significance}</p>
                                    </div>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
};

export default ClaimsDisplay;
