"use client";

import React, { createContext, useContext, useCallback, useState } from "react";
import { Toast, ToastContainer } from "./toast";

type ToastType = "default" | "success" | "error" | "warning" | "info";

interface ToastOptions {
    type?: ToastType;
    duration?: number;
}

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    duration: number;
}

interface ToastContextType {
    showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, options?: ToastOptions) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: ToastItem = {
            id,
            message,
            type: options?.type || "default",
            duration: options?.duration || 3000, // default 3 seconds
        };

        setToasts((prev) => [...prev, newToast]);

        // Auto-dismiss the toast after its duration
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, newToast.duration);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    // Provide the toast context
    const contextValue = { showToast };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <ToastContainer>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        variant={toast.type}
                        onClose={() => dismissToast(toast.id)}
                    >
                        {toast.message}
                    </Toast>
                ))}
            </ToastContainer>
        </ToastContext.Provider>
    );
}; 