"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export interface ArticleData {
    title?: string;
    source?: string;
    author?: string;
    imageUrl?: string;
    description?: string;
    url?: string;
}

interface ArticlePreviewProps {
    article: ArticleData;
}

const ArticlePreview: React.FC<ArticlePreviewProps> = ({ article }) => {
    const { title, author, imageUrl, description, url } = article;
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    // Function to truncate URL for display
    const getTruncatedUrl = (url: string) => {
        try {
            // Remove protocol and trailing slashes for cleaner display
            const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

            // If URL is too long, truncate it
            if (displayUrl.length > 40) {
                return displayUrl.substring(0, 37) + '...';
            }
            return displayUrl;
        } catch {
            return url;
        }
    };

    return (
        <Card className="mb-6 overflow-hidden">
            <CardContent className="pt-6 p-0">
                <div className="flex flex-col space-y-3">
                    {/* Article image if available */}
                    {imageUrl && !imageError && (
                        <div className="relative w-full h-48">
                            <Image
                                src={imageUrl}
                                alt={title || "Article image"}
                                fill
                                className="object-cover rounded-t-lg"
                                sizes="(max-width: 768px) 100vw, 768px"
                                onError={handleImageError}
                                priority
                            />
                        </div>
                    )}

                    {/* Fallback for image errors */}
                    {imageError && (
                        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg flex items-center justify-center">
                            <span className="text-muted-foreground">Image unavailable</span>
                        </div>
                    )}

                    <div className="px-6 pb-6">
                        {/* Title */}
                        {title && (
                            <h3 className="text-xl font-semibold line-clamp-2 mb-1">{title}</h3>
                        )}

                        {/* Author - only if available */}
                        {author && (
                            <p className="text-sm text-muted-foreground mb-2">{author}</p>
                        )}

                        {/* Description */}
                        {description && (
                            <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
                        )}

                        {/* URL - truncated */}
                        {url && (
                            <p className="text-xs text-muted-foreground truncate mt-2 opacity-70">
                                {getTruncatedUrl(url)}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ArticlePreview; 