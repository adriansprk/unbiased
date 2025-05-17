"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

/**
 * Header component that provides navigation throughout the application
 */
const Header = () => {

    return (
        <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
            <div className="container mx-auto flex justify-between items-center h-16 px-4">
                <Link href="/" className="font-bold text-xl flex items-center gap-2">
                    <Image
                        src="/unbiased-icon.svg"
                        alt="Unbiased logo"
                        width={24}
                        height={24}
                        className="dark:invert"
                    />
                    Unbiased
                </Link>
                <nav className="flex items-center">
                    <div className="flex items-center space-x-2">
                        <LanguageSwitcher />
                        <ThemeToggle />
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default Header; 