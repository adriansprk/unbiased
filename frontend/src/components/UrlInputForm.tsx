"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { USE_MOCK_API } from '@/lib/config';
import api from '@/lib/apiClient';
import mockService from '@/lib/mockApiService';

// Use either the real or mock services based on configuration
const apiService = USE_MOCK_API ? mockService.api : api;

// Form validation schema
const formSchema = z.object({
    url: z.string().url({ message: "Please enter a valid URL" }),
});

interface UrlInputFormProps {
    onSubmitSuccess: (jobId: string) => void;
}

const UrlInputForm: React.FC<UrlInputFormProps> = ({ onSubmitSuccess }) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            url: "",
        },
    });

    // Handle form submission
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setError(null);
        setIsLoading(true);

        try {
            // Use the apiService instead of direct axios call
            const response = await apiService.submitUrl(values.url);

            // Handle successful submission
            if (response && response.jobId) {
                onSubmitSuccess(response.jobId);
                form.reset(); // Clear the form
            } else {
                setError("Invalid response from server");
            }
        } catch (error) {
            console.error("Error submitting URL:", error);
            setError("Failed to submit URL. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Paste article URL for analysis ...</CardTitle>
                <CardDescription>Paste the URL of the article you want to analyze</CardDescription>
            </CardHeader>
            <CardContent>
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
                                                placeholder="Paste article URL for analysis ..."
                                                {...field}
                                                disabled={isLoading}
                                                className="flex-grow"
                                            />
                                            <Button
                                                type="submit"
                                                disabled={isLoading}
                                                className="whitespace-nowrap"
                                            >
                                                {isLoading ? "Submitting..." : "Analyze"}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {error && (
                            <div className="text-red-600 dark:text-red-400 text-sm" role="alert">
                                {error}
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

export default UrlInputForm; 