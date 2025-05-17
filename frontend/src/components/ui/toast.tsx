"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

// Toast container for positioning toasts
const ToastContainer = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-xs",
            className
        )}
        {...props}
    />
));
ToastContainer.displayName = "ToastContainer";

const toastVariants = cva(
    "group relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full",
    {
        variants: {
            variant: {
                default: "border-border bg-background text-foreground",
                success: "border-green-500/20 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-50",
                error: "border-red-500/20 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-50",
                warning: "border-yellow-500/20 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-50",
                info: "border-blue-500/20 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-50",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

interface ToastProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
    onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
    ({ className, variant, onClose, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(toastVariants({ variant }), className)}
                {...props}
            >
                <div className="flex-1">{children}</div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        );
    }
);
Toast.displayName = "Toast";

export { ToastContainer, Toast }; 