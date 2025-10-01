"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Publication {
    name: string;
    domain: string;
}

const publications: Publication[] = [
    { name: "Spiegel", domain: "spiegel.de" },
    { name: "Tagesspiegel", domain: "tagesspiegel.de" },
    { name: "FAZ", domain: "faz.net" },
    { name: "Süddeutsche Zeitung", domain: "sueddeutsche.de" },
    { name: "Bild", domain: "bild.de" },
    { name: "taz", domain: "taz.de" },
    { name: "Die Zeit", domain: "zeit.de" },
    { name: "Politico", domain: "politico.com" },
    { name: "The Atlantic", domain: "theatlantic.com" },
    { name: "CNN", domain: "cnn.com" },
    { name: "Fox News", domain: "foxnews.com" },
    { name: "Le Monde", domain: "lemonde.fr" },
    { name: "New York Times", domain: "nytimes.com" },
    { name: "Frankfurter Rundschau", domain: "fr.de" },
    { name: "The Times", domain: "thetimes.com" },
    { name: "BBC", domain: "bbc.com" },
    { name: "La Repubblica", domain: "repubblica.it" },
];

const PublicationCarousel: React.FC = () => {
    const apiKey = process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY;

    // Duplicate the publications array for seamless loop
    const duplicatedPublications = [...publications, ...publications];

    return (
        <div className="w-full overflow-hidden py-8">
            <div className="relative flex gap-6 animate-scroll">
                {duplicatedPublications.map((pub, index) => (
                    <div
                        key={`${pub.domain}-${index}`}
                        className={cn(
                            "flex-shrink-0 flex items-center justify-center",
                            "px-8 py-4 rounded-lg",
                            "border border-border/50 dark:border-border",
                            "bg-card/50 dark:bg-card/30 backdrop-blur-sm",
                            "hover:border-border transition-all duration-200",
                            "min-w-[140px] h-[60px]"
                        )}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://img.logo.dev/${pub.domain}?token=${apiKey}&format=png&size=200`}
                            alt={`${pub.name} logo`}
                            className="object-contain max-h-8 w-auto"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PublicationCarousel;
