"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon } from "lucide-react";
import { Glow } from "@/components/ui/glow";
import { cn } from "@/lib/utils";
import PublicationCarousel from "@/components/PublicationCarousel";

interface HeroAction {
    text: string;
    href: string;
    icon?: React.ReactNode;
    variant?: "default" | "glow";
}

interface HeroProps {
    badge?: {
        text: string;
        action?: {
            text: string;
            href: string;
        };
    };
    title: string;
    description: string;
    actions?: HeroAction[];
    showUrlInput?: boolean;
    urlInputComponent?: React.ReactNode;
}

export function HeroSection({
    badge,
    title,
    description,
    actions,
    showUrlInput,
    urlInputComponent,
}: HeroProps) {
    return (
        <section
            className={cn(
                "bg-background text-foreground w-full",
                "py-12 sm:py-16 md:py-24 px-4",
                "relative overflow-hidden"
            )}
        >
            <div className="mx-auto flex max-w-container flex-col gap-8 pt-8 sm:gap-12">
                <div className="flex flex-col items-center gap-6 text-center sm:gap-8">
                    {/* Badge */}
                    {badge && (
                        <Badge variant="outline" className="animate-appear gap-2">
                            <span className="text-muted-foreground">{badge.text}</span>
                            {badge.action && (
                                <a href={badge.action.href} className="flex items-center gap-1">
                                    {badge.action.text}
                                    <ArrowRightIcon className="h-3 w-3" />
                                </a>
                            )}
                        </Badge>
                    )}

                    {/* Title */}
                    <h1 className="relative z-10 inline-block animate-appear bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-4xl font-semibold leading-tight text-transparent drop-shadow-2xl sm:text-6xl sm:leading-tight md:text-7xl md:leading-tight">
                        {title}
                    </h1>

                    {/* Description */}
                    <p className="text-md relative z-10 max-w-[550px] animate-appear font-medium text-muted-foreground opacity-0 delay-100 sm:text-xl">
                        {description}
                    </p>

                    {/* Actions or URL Input */}
                    {actions && !showUrlInput && (
                        <div className="relative z-10 flex animate-appear justify-center gap-4 opacity-0 delay-300">
                            {actions.map((action, index) => (
                                <Button key={index} variant={action.variant === "glow" ? "outline" : "default"} size="lg" asChild>
                                    <a href={action.href} className="flex items-center gap-2">
                                        {action.icon}
                                        {action.text}
                                    </a>
                                </Button>
                            ))}
                        </div>
                    )}

                    {showUrlInput && urlInputComponent && (
                        <div className="relative z-10 animate-appear opacity-0 delay-300 w-full max-w-2xl">
                            {urlInputComponent}
                        </div>
                    )}

                    {/* Background glow */}
                    <Glow
                        variant="top"
                        className="animate-appear-zoom opacity-0 delay-700 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    />
                </div>

                {/* Publication carousel */}
                {showUrlInput && (
                    <div className="relative z-10 w-full animate-appear opacity-0 delay-1000">
                        <PublicationCarousel />
                    </div>
                )}
            </div>
        </section>
    );
} 