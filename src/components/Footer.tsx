"use client";

import Link from "next/link";
import { Icons } from "@/components/ui/icons";

export function Footer() {
    return (
        <footer className="w-full border-t py-4 mt-auto">
            <div className="container flex items-center justify-center text-sm text-muted-foreground">
                <p>Coded with curiosity</p>
                <span className="mx-2">|</span>
                <div className="flex items-center space-x-3">
                    <Link
                        href="https://github.com/adriansprk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center transition-colors hover:text-foreground"
                        aria-label="GitHub"
                    >
                        <Icons.gitHub className="h-5 w-5" />
                    </Link>
                    <Link
                        href="https://www.linkedin.com/in/adriankrueger/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center transition-colors hover:text-foreground"
                        aria-label="LinkedIn"
                    >
                        <Icons.linkedIn className="h-5 w-5" />
                    </Link>
                </div>
            </div>
        </footer>
    );
} 