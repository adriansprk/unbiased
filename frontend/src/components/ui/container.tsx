import React from "react";
import { cn } from "@/lib/utils";

export const Container: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <div
            className={cn("container px-4 mx-auto", className)}
            {...props}
        >
            {children}
        </div>
    );
}; 