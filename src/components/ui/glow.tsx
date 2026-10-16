"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GlowProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "bottom" | "top";
}

export function Glow({
    className,
    variant = "bottom",
    ...props
}: GlowProps) {
    return (
        <div
            className={cn(
                "pointer-events-none absolute select-none",
                {
                    "left-0 right-0 top-0 -z-10 mx-0 h-40 w-full rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/5 to-pink-500/20 opacity-70 blur-[100px]":
                        variant === "top",
                    "-bottom-40 left-0 right-0 -z-10 mx-0 h-60 w-full rounded-full bg-gradient-to-r from-pink-500/25 via-purple-500/5 to-indigo-500/20 opacity-70 blur-[100px]":
                        variant === "bottom",
                },
                className
            )}
            {...props}
        ></div>
    );
} 