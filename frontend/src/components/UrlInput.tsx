"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import TurnstileWidget, { TurnstileWidgetRef } from "@/components/TurnstileWidget";
import { api } from '@/lib/apiClient';
import { useAnalysisStore } from '@/lib/store';
import logger from "@/utils/logger";
import { useTranslations, useLocale } from 'next-intl';

// Form validation schema
const formSchema = z.object({
    url: z.string().url({ message: "Please enter a valid URL" }),
});

interface UrlInputProps {
    onSubmitSuccess: (url: string) => void;
    isLoading?: boolean;
    jobStatus?: string | null;
    shouldResetUrlInput?: boolean;
}

// Key for storing token in sessionStorage
const TURNSTILE_TOKEN_STORAGE_KEY = 'turnstile_token';

const UrlInput: React.FC<UrlInputProps> = ({ onSubmitSuccess, isLoading: externalLoading, jobStatus, shouldResetUrlInput = false }) => {
    const t = useTranslations('UrlInput');
    const statusT = useTranslations('Status');
    const locale = useLocale();

    const [error, setError] = useState<string | null>(null);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileError, setTurnstileError] = useState<string | null>(null);
    const [showTurnstile, setShowTurnstile] = useState<boolean>(false);
    const turnstileRef = useRef<TurnstileWidgetRef>(null);
    const stateUpdateInProgress = useRef<boolean>(false);
    const updateWithApiResponse = useAnalysisStore(state => state.updateWithApiResponse);

    // Check if in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Use either external or internal loading state
    const isLoading = externalLoading !== undefined ? externalLoading : false;

    // Initialize form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            url: "",
        },
    });

    // Safely updates the turnstile visibility state
    const updateTurnstileVisibility = (show: boolean) => {
        if (stateUpdateInProgress.current) return;

        stateUpdateInProgress.current = true;

        // Use setTimeout to avoid React state update conflicts
        setTimeout(() => {
            logger.debug(`[UrlInput] Setting Turnstile visibility: ${show}`);
            setShowTurnstile(show);
            stateUpdateInProgress.current = false;
        }, 0);
    };

    // Check for stored token on initial mount
    useEffect(() => {
        if (isDevelopment) return;

        try {
            // Load token from sessionStorage if available
            const storedToken = sessionStorage.getItem(TURNSTILE_TOKEN_STORAGE_KEY);
            if (storedToken) {
                logger.debug("[UrlInput] Found stored Turnstile token, length:", storedToken.length);
                setTurnstileToken(storedToken);
                updateTurnstileVisibility(false);
            } else {
                // Show widget if no token is available
                logger.debug("[UrlInput] No stored token found, showing Turnstile widget");
                updateTurnstileVisibility(true);
            }
        } catch (e) {
            logger.warn("[UrlInput] Error accessing sessionStorage:", e);
            updateTurnstileVisibility(true);
        }
    }, [isDevelopment]);

    // Reset form on status change to Complete or Failed
    useEffect(() => {
        if (jobStatus === "Complete" || jobStatus === "Failed") {
            // Keep the URL value but allow interaction again
            form.clearErrors();

            // For Complete status, we DO NOT reset the token immediately
            // This allows the "Analyze New" button to be enabled
            // The token will be reset on the next submission
            if (jobStatus === "Failed") {
                // Only reset token for Failed state
                setTurnstileToken(null);
                try {
                    sessionStorage.removeItem(TURNSTILE_TOKEN_STORAGE_KEY);
                } catch (e) {
                    logger.warn("[UrlInput] Error clearing sessionStorage:", e);
                }

                // Show the widget for retry
                if (!isDevelopment) {
                    updateTurnstileVisibility(true);
                }
            } else if (jobStatus === "Complete") {
                // When a job completes, the current Turnstile token is now "used" for that job.
                // For a "Analyze New" flow, we will require a fresh one.
                // So, clear the token now. The widget remains hidden until the user clicks "Analyze New"
                // and onSubmit determines a new token is needed.
                if (!isDevelopment) {
                    logger.debug("[UrlInput] Job complete. Invalidating current Turnstile token in preparation for potential 'Analyze New'.");
                    setTurnstileToken(null);
                    try {
                        sessionStorage.removeItem(TURNSTILE_TOKEN_STORAGE_KEY);
                    } catch (e) {
                        logger.warn("[UrlInput] Error clearing sessionStorage after job completion:", e);
                    }
                }
                updateTurnstileVisibility(false); // Keep widget hidden initially for "Analyze New"
            }
        }
    }, [jobStatus, form, isDevelopment]);

    // Clear the form when shouldResetUrlInput is set to true in the store
    useEffect(() => {
        if (shouldResetUrlInput) {
            logger.debug("Resetting URL form due to store signal");
            form.reset();
            setTurnstileToken(null);
            setTurnstileError(null);

            try {
                // Clear stored token
                sessionStorage.removeItem(TURNSTILE_TOKEN_STORAGE_KEY);
            } catch (e) {
                logger.warn("[UrlInput] Error clearing sessionStorage:", e);
            }

            // Reset turnstile widget and show it again
            if (!isDevelopment) {
                updateTurnstileVisibility(true);
            }
        }
    }, [shouldResetUrlInput, form, isDevelopment]);

    // Handle Turnstile verification
    const handleTurnstileVerify = (token: string) => {
        logger.debug("[UrlInput] Turnstile verification successful, token length:", token.length);

        // Update state
        setTurnstileToken(token);
        setTurnstileError(null);

        // Hide the widget after verification
        updateTurnstileVisibility(false);

        // Store token in sessionStorage for persistence across locale changes
        try {
            sessionStorage.setItem(TURNSTILE_TOKEN_STORAGE_KEY, token);
        } catch (e) {
            logger.warn("[UrlInput] Error storing token in sessionStorage:", e);
        }
    };

    // Handle Turnstile error
    const handleTurnstileError = (errorCode: string) => {
        logger.error("[UrlInput] Turnstile error:", errorCode);

        // Special handling for error code 300030 (widget hung)
        if (errorCode === '300030') {
            setTurnstileError(`Verification widget is having trouble loading. Please wait while we retry automatically.`);
        } else {
            setTurnstileError(`Verification error: ${errorCode}`);
        }

        setTurnstileToken(null);

        // Clear stored token on error
        try {
            sessionStorage.removeItem(TURNSTILE_TOKEN_STORAGE_KEY);
        } catch (e) {
            logger.warn("[UrlInput] Error clearing sessionStorage:", e);
        }

        // Always show widget on error
        updateTurnstileVisibility(true);
    };

    // Handle Turnstile token expiration
    const handleTurnstileExpire = () => {
        logger.warn("[UrlInput] Turnstile token expired");
        setTurnstileToken(null);
        setTurnstileError("Verification token expired. Please complete the challenge again.");

        // Clear stored token on expiry
        try {
            sessionStorage.removeItem(TURNSTILE_TOKEN_STORAGE_KEY);
        } catch (e) {
            logger.warn("[UrlInput] Error clearing sessionStorage:", e);
        }

        // Show widget again when token expires
        updateTurnstileVisibility(true);
    };

    // Handle Turnstile widget load
    const handleTurnstileLoad = () => {
        logger.debug("[UrlInput] Turnstile widget loaded");
        setTurnstileError(null);
    };

    // Handle form submission
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        logger.debug(`[UrlInput] Form submitted with URL: ${values.url}`);

        // Clear any previous errors
        setError(null);

        // If not in development and no token, prompt for verification.
        // This applies to initial submissions and "Analyze New" attempts where token was cleared by useEffect.
        if (!isDevelopment && !turnstileToken) {
            logger.debug("[UrlInput] Submission attempt without token. Showing Turnstile.");
            setError(t('verificationRequired'));
            updateTurnstileVisibility(true); // Show widget
            if (turnstileRef.current) {
                // Attempt to reset the widget to ensure it's active for the new challenge.
                // TurnstileWidget's reset is idempotent if widgetId is null.
                turnstileRef.current.resetWidget();
            }
            return; // Wait for user to solve Turnstile
        }

        // If we reach here, we have a token (if required for !isDevelopment) or we are in development.
        // Store token locally to ensure it survives any state changes
        // Use a string type instead of string|null to match the API parameter type
        const tokenToSubmit: string = turnstileToken || ""; // Ensure tokenToSubmit is always a string

        try {
            // Log the token we're about to submit for debugging
            logger.debug(`[UrlInput] Submitting URL with turnstile token (${tokenToSubmit.length} chars): ${tokenToSubmit.substring(0, 20)}...`);

            // Call the API with the URL, current locale, and turnstile token
            const response = await api.submitUrl(
                values.url,
                locale, // Use the current locale instead of hardcoded 'en'
                isDevelopment ? undefined : tokenToSubmit
            );

            // We check response.data but don't need to use it directly
            if (!response || !response.data) {
                throw new Error('Failed to submit URL');
            }

            // Update the store with the API response directly instead of triggering a second API call
            updateWithApiResponse(response.data);

            // Still call onSubmitSuccess for any UI-related functions that need to happen 
            // (but without triggering another API call)
            onSubmitSuccess(values.url);

            // Don't immediately clear token on success, only when user starts a new analysis

        } catch (error) {
            logger.error("Error submitting URL:", error);

            // Get more detailed error message if available
            let errorMessage = t('submitError');

            // Type-safe way to extract error messages
            if (error instanceof Error) {
                errorMessage = error.message || errorMessage;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }

            // Log the error object structure to help with debugging
            logger.error("[UrlInput] Error details:", JSON.stringify(error, null, 2));

            // Try to extract more specific error messages from response if available
            try {
                const unknownError = error as unknown;

                // Check if it's an axios error with response data
                interface AxiosErrorResponse {
                    response?: {
                        data?: unknown;
                        status?: number;
                    };
                }

                if (typeof unknownError === 'object' &&
                    unknownError !== null &&
                    'response' in unknownError) {

                    const axiosError = unknownError as AxiosErrorResponse;
                    const responseData = axiosError.response?.data;

                    if (responseData) {
                        logger.error("[UrlInput] API Error response:", responseData);

                        // Type guard for responseData with message property
                        if (typeof responseData === 'object' && responseData !== null) {
                            // Handle string message
                            if ('message' in responseData && typeof responseData.message === 'string') {
                                errorMessage = responseData.message;
                            }
                            // Handle array of validation errors
                            else if (Array.isArray(responseData) && responseData.length > 0) {
                                const firstError = responseData[0];
                                if (typeof firstError === 'object' &&
                                    firstError !== null &&
                                    'message' in firstError &&
                                    typeof firstError.message === 'string') {

                                    errorMessage = `Validation error: ${firstError.message}`;

                                    // Special handling for Turnstile errors
                                    if ('path' in firstError &&
                                        Array.isArray(firstError.path) &&
                                        firstError.path.includes('cf-turnstile-response')) {

                                        errorMessage = t('verificationFailed');
                                        // Force a complete reset of the Turnstile widget
                                        setTurnstileToken(null);
                                        try {
                                            sessionStorage.removeItem(TURNSTILE_TOKEN_STORAGE_KEY);
                                        } catch (e) {
                                            logger.warn("[UrlInput] Error clearing sessionStorage:", e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (extractionError) {
                logger.error("[UrlInput] Error while extracting detailed error message:", extractionError);
            }

            setError(errorMessage);

            // Reset token on error for retry
            setTurnstileToken(null);
            try {
                sessionStorage.removeItem(TURNSTILE_TOKEN_STORAGE_KEY);
            } catch (e) {
                logger.warn("[UrlInput] Error clearing sessionStorage:", e);
            }

            // Reset turnstile widget and show it again
            if (!isDevelopment) {
                updateTurnstileVisibility(true);

                // Give widget time to appear before resetting
                setTimeout(() => {
                    if (turnstileRef.current) {
                        turnstileRef.current.resetWidget();
                    }
                }, 300);
            }
        }
    };

    // Get a human-readable message for the status
    const getStatusMessage = () => {
        switch (jobStatus) {
            case 'Queued':
                return statusT('queued');
            case 'Processing':
                return statusT('processing');
            case 'Fetching':
                return statusT('fetching');
            case 'Analyzing':
                return statusT('analyzing');
            case 'Complete':
                return statusT('complete');
            case 'Failed':
                return statusT('failed');
            default:
                return t('submit');
        }
    };

    // Determine button text based on job status
    const getButtonContent = () => {
        if (isLoading) {
            if (jobStatus && ['Queued', 'Processing', 'Fetching', 'Analyzing'].includes(jobStatus)) {
                return (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{getStatusMessage()}</span>
                    </div>
                );
            }
            return t('analyzing');
        }

        // Handle completion states
        if (jobStatus === "Complete") {
            return (
                <div className="flex items-center gap-2">
                    <span>{t('analyzeNew')}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>
            );
        }

        if (jobStatus === "Failed") {
            return (
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>{t('tryAgain')}</span>
                </div>
            );
        }

        return t('submit');
    };

    // Determine if button should be disabled
    const isSubmitDisabled = isLoading && jobStatus !== "Complete" && jobStatus !== "Failed";
    // Don't require turnstile for "Analyze New" (Complete state) until form is submitted
    const isTurnstileRequired = !isDevelopment && !turnstileToken && jobStatus !== "Complete";

    return (
        <div className="w-full max-w-3xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="url"
                        render={({ field }: { field: ControllerRenderProps<{ url: string }, "url"> }) => (
                            <FormItem>
                                <FormControl>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input
                                            placeholder={t('placeholder')}
                                            {...field}
                                            disabled={isSubmitDisabled}
                                            className="flex-grow"
                                        />
                                        <Button
                                            type="submit"
                                            disabled={isSubmitDisabled || isTurnstileRequired}
                                            className="whitespace-nowrap min-w-[180px]"
                                        >
                                            {getButtonContent()}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Only show Turnstile when verification is needed */}
                    {!isDevelopment && showTurnstile && (
                        <div className="py-2">
                            <TurnstileWidget
                                ref={turnstileRef}
                                onVerify={handleTurnstileVerify}
                                onError={handleTurnstileError}
                                onExpire={handleTurnstileExpire}
                                onLoad={handleTurnstileLoad}
                            />
                        </div>
                    )}

                    {turnstileError && (
                        <div className="text-amber-600 dark:text-amber-400 text-sm" role="alert">
                            {turnstileError}
                        </div>
                    )}

                    {error && (
                        <div className="text-red-600 dark:text-red-400 text-sm" role="alert">
                            {error}
                        </div>
                    )}
                </form>
            </Form>
        </div>
    );
};

export default UrlInput; 