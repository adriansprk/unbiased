import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Script from 'next/script'; // Use Next.js Script component
import { useTheme } from 'next-themes'; // Import useTheme to detect dark/light mode
import logger from "@/utils/logger"; // Added import

// Define Turnstile types
interface TurnstileParameters {
    sitekey: string;
    callback: (token: string) => void;
    'error-callback'?: (errorCode: string) => void;
    'expired-callback'?: () => void;
    'timeout-callback'?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    appearance?: 'always' | 'execute' | 'interaction-only';
    size?: 'normal' | 'compact' | 'flexible';
    retry?: 'auto' | 'never';
    'refresh-expired'?: 'auto' | 'manual' | 'never';
    tabindex?: number;
    'response-field'?: boolean;
    'response-field-name'?: string;
    'execution'?: 'execute' | 'render';
    cData?: string;
    language?: string;
}

export interface TurnstileWidgetRef {
    resetWidget: () => void;
    removeWidget: () => void;
}

interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onError?: (errorCode: string) => void;
    onExpire?: () => void;
    onLoad?: () => void;
    siteKey?: string;
    theme?: 'light' | 'dark' | 'auto';
}

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: string | HTMLElement,
                params: TurnstileParameters
            ) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
            getResponse: (widgetId: string) => string;
        };
        onloadTurnstileCallback?: () => void;
    }
}

const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
    ({ onVerify, onError, onExpire, onLoad, siteKey, theme: propTheme = 'auto' }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const [widgetId, setWidgetId] = useState<string | null>(null);
        const [isScriptLoaded, setIsScriptLoaded] = useState(false);
        const [retryCount, setRetryCount] = useState(0);
        const [isErrorState, setIsErrorState] = useState(false);
        const maxRetries = 3;
        const retryTimeout = useRef<NodeJS.Timeout | null>(null);
        const lastTheme = useRef<string | null>(null);
        const renderInProgress = useRef<boolean>(false);

        // Get the current app theme - simplified to avoid waiting for theme detection
        const { theme: appTheme } = useTheme();
        
        // Use dark theme as default without waiting for system detection
        // This matches our ThemeProvider default setting
        const widgetTheme = propTheme !== 'auto'
            ? propTheme
            : 'dark'; // Always use dark theme by default

        // Use the siteKey from props or from environment variable
        const actualSiteKey = siteKey || process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;

        if (!actualSiteKey) {
            logger.error('Turnstile site key is not defined!');
        }

        // Reset the widget
        const resetWidget = useCallback(() => {
            logger.debug('[TurnstileWidget] Resetting widget:', widgetId);
            if (window.turnstile && widgetId) {
                try {
                    window.turnstile.reset(widgetId);
                } catch (e) {
                    logger.error('[TurnstileWidget] Error resetting widget:', e);
                }
            }
            setIsErrorState(false);
        }, [widgetId]);

        // Remove the widget completely
        const removeWidget = useCallback(() => {
            logger.debug('[TurnstileWidget] Removing widget:', widgetId);
            // Clear any pending retry timeouts
            if (retryTimeout.current) {
                clearTimeout(retryTimeout.current);
                retryTimeout.current = null;
            }

            if (window.turnstile && widgetId) {
                try {
                    window.turnstile.remove(widgetId);
                    logger.debug('[TurnstileWidget] Successfully removed widget:', widgetId);
                } catch (e) {
                    logger.error('[TurnstileWidget] Error removing widget:', e);
                }
            }
            setWidgetId(null);
            setIsErrorState(false);
        }, [widgetId]);

        // Expose methods to parent component
        useImperativeHandle(ref, () => ({
            resetWidget,
            removeWidget
        }));

        // Render the widget
        const renderWidget = useCallback(() => {
            // Prevent re-entry
            if (renderInProgress.current) {
                return;
            }

            if (!window.turnstile || !containerRef.current || !actualSiteKey) {
                logger.warn('[TurnstileWidget] Cannot render widget: missing dependencies');
                return;
            }

            // Set flag to prevent re-entries during render
            renderInProgress.current = true;

            logger.debug('[TurnstileWidget] Attempting to render widget in container');

            try {
                // Remove any existing widget first
                if (widgetId) {
                    try {
                        window.turnstile.remove(widgetId);
                        logger.debug('[TurnstileWidget] Removed existing widget before rendering new one');
                    } catch (e) {
                        logger.error('[TurnstileWidget] Error removing existing widget:', e);
                    }
                }

                // Render the widget
                const id = window.turnstile.render(containerRef.current, {
                    sitekey: actualSiteKey,
                    theme: widgetTheme,
                    callback: (token: string) => {
                        logger.debug('[TurnstileWidget] Verification successful');
                        onVerify(token);
                        setIsErrorState(false);
                    },
                    'error-callback': (errorCode: string) => {
                        logger.error('[TurnstileWidget] Error callback, code:', errorCode);

                        // Special handling for error code 300030 (widget hung)
                        if (errorCode === '300030') {
                            setIsErrorState(true);

                            // If we haven't exceeded max retries, try again
                            if (retryCount < maxRetries) {
                                logger.debug(`[TurnstileWidget] Widget hung (300030), retry attempt ${retryCount + 1}`);

                                // Clear any previous retry timeout
                                if (retryTimeout.current) {
                                    clearTimeout(retryTimeout.current);
                                }

                                // Schedule a retry with simple backoff
                                retryTimeout.current = setTimeout(() => {
                                    setRetryCount(prev => prev + 1);
                                    // Don't remove and re-render, just reset
                                    resetWidget();
                                }, 1000 * (retryCount + 1)); // Simple backoff
                            }
                        }

                        if (onError) {
                            onError(errorCode);
                        }
                    },
                    'expired-callback': () => {
                        logger.debug('[TurnstileWidget] Token expired');
                        if (onExpire) {
                            onExpire();
                        }
                    },
                    'timeout-callback': () => {
                        logger.debug('[TurnstileWidget] Request timed out');
                    },
                    retry: 'auto',
                    'refresh-expired': 'auto',
                });

                logger.debug('[TurnstileWidget] Widget rendered successfully, ID:', id);
                setWidgetId(id);
                lastTheme.current = widgetTheme;
                setIsErrorState(false);
            } catch (error) {
                logger.error('[TurnstileWidget] Error rendering widget:', error);
                setIsErrorState(true);
            } finally {
                // Clear rendering flag
                renderInProgress.current = false;
            }
        }, [actualSiteKey, onError, onExpire, onVerify, widgetTheme, widgetId, resetWidget, retryCount]);

        // Handle script load
        const handleScriptLoad = useCallback(() => {
            logger.debug('[TurnstileWidget] Script loaded.');
            setIsScriptLoaded(true);
            if (onLoad) {
                onLoad();
            }

            // Render widget immediately after script loads
            renderWidget();
        }, [onLoad, renderWidget]);

        // Handle script error
        const handleScriptError = useCallback(() => {
            logger.error('[TurnstileWidget] Script failed to load.');
            setIsScriptLoaded(false);
            setIsErrorState(true);
            if (onError) {
                onError('script-load-error');
            }
        }, [onError]);

        // Re-render widget when retry count changes
        useEffect(() => {
            if (retryCount > 0 && isScriptLoaded && containerRef.current) {
                logger.debug(`[TurnstileWidget] Re-rendering after retry ${retryCount}`);
                renderWidget();
            }
        }, [retryCount, isScriptLoaded, renderWidget]);

        // Only update the widget when the app theme changes from light to dark or vice versa
        // This prevents unnecessary resets during initial theme detection
        useEffect(() => {
            if (!isScriptLoaded || !widgetId || !appTheme || appTheme === 'system') {
                return;
            }

            // Only care about explicit theme changes by the user
            if (appTheme === 'light' || appTheme === 'dark') {
                const newTheme = appTheme === 'dark' ? 'dark' : 'light';
                
                // Skip if the theme hasn't actually changed
                if (lastTheme.current === newTheme) {
                    return;
                }
                
                logger.debug(`[TurnstileWidget] Theme explicitly changed to ${newTheme}, updating widget`);
                lastTheme.current = newTheme;
                
                // Give the widget a moment to stabilize before resetting
                const timeoutId = setTimeout(() => {
                    resetWidget();
                }, 500);
                
                return () => clearTimeout(timeoutId);
            }
        }, [appTheme, isScriptLoaded, widgetId, resetWidget]);

        // Clean up on unmount
        useEffect(() => {
            return () => {
                logger.debug('[TurnstileWidget] Component unmounting, cleaning up resources');
                if (retryTimeout.current) {
                    clearTimeout(retryTimeout.current);
                }

                if (widgetId && window.turnstile) {
                    try {
                        window.turnstile.remove(widgetId);
                        logger.debug('[TurnstileWidget] Successfully cleaned up widget on unmount');
                    } catch (e) {
                        logger.error('[TurnstileWidget] Error removing widget on unmount:', e);
                    }
                }
            };
        }, [widgetId]);

        return (
            <>
                <Script
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                    id="turnstile-script"
                    onLoad={handleScriptLoad}
                    onError={handleScriptError}
                    strategy="afterInteractive" // Load sooner than lazyload
                />
                <div
                    ref={containerRef}
                    className="cf-turnstile-container mt-2"
                    data-testid="turnstile-container"
                />
                {isErrorState && retryCount >= maxRetries && (
                    <div className="text-amber-600 text-sm mt-2">
                        The verification widget had trouble loading.
                        <button
                            onClick={() => {
                                setRetryCount(0);
                                setIsErrorState(false);
                                renderWidget();
                            }}
                            className="ml-2 underline hover:text-amber-800 cursor-pointer"
                        >
                            Try again
                        </button>
                        or refresh the page.
                    </div>
                )}
            </>
        );
    }
);

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget; 