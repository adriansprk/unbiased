"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MockupFrameProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "small" | "medium" | "large";
    variant?: "light" | "dark";
}

export function MockupFrame({
    children,
    className,
    size = "medium",
    variant = "light",
    ...props
}: MockupFrameProps) {
    const sizeClasses = {
        small: "p-1 md:p-2",
        medium: "p-2 md:p-4",
        large: "p-3 md:p-6",
    };

    return (
        <div
            className={cn(
                "rounded-2xl",
                {
                    "border border-border bg-card/20 shadow-sm": variant === "light",
                    "border border-border/20 bg-card/50 shadow-xl": variant === "dark",
                },
                sizeClasses[size],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

interface MockupProps {
    children: React.ReactNode;
    type?: "browser" | "phone" | "responsive";
    className?: string;
}

export function Mockup({ children, type = "browser", className }: MockupProps) {
    if (type === "responsive") {
        return (
            <div
                className={cn(
                    "rounded-xl border border-border bg-background overflow-hidden shadow-md",
                    className
                )}
            >
                <div className="flex h-6 items-center border-b border-border bg-muted/50 px-2">
                    <div className="flex space-x-1">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
                    </div>
                    <div className="mx-2 h-2 flex-1 rounded-md bg-muted-foreground/15"></div>
                </div>
                <div className="relative">{children}</div>
            </div>
        );
    }

    if (type === "phone") {
        return (
            <div
                className={cn(
                    "relative mx-auto h-[600px] w-[300px] rounded-[3rem] border-[14px] border-card bg-card shadow-xl",
                    className
                )}
            >
                <div className="absolute left-1/2 top-0 z-10 h-6 w-20 -translate-x-1/2 rounded-b-xl bg-card"></div>
                <div className="h-full w-full overflow-hidden rounded-[2.3rem] bg-background">
                    {children}
                </div>
            </div>
        );
    }

    // Default browser mockup
    return (
        <div
            className={cn(
                "rounded-xl border border-border bg-background overflow-hidden shadow-md",
                className
            )}
        >
            <div className="flex h-8 items-center border-b border-border bg-muted/50 px-4">
                <div className="flex space-x-2">
                    <div className="h-3 w-3 rounded-full bg-muted-foreground/30"></div>
                    <div className="h-3 w-3 rounded-full bg-muted-foreground/30"></div>
                    <div className="h-3 w-3 rounded-full bg-muted-foreground/30"></div>
                </div>
                <div className="mx-4 h-4 flex-1 rounded-md bg-muted-foreground/15"></div>
            </div>
            <div className="relative">{children}</div>
        </div>
    );
} 