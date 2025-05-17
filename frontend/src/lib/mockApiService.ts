import { AnalysisData } from '@/types/analysis';
import exampleAnalysisJson from '../__tests__/data/example-analysis.json';
import { AxiosRequestConfig } from 'axios';

// Use imported example analysis data from the template
const exampleAnalysisData: AnalysisData = exampleAnalysisJson as AnalysisData;

// Note: We've replaced the hardcoded example data with data imported from the JSON template file

// Alternative example to show variety
const secondExampleData: AnalysisData = {
    "slant": {
        "category": "Center-Right",
        "rationale": "The article approaches issues from a moderately conservative perspective, emphasizing individual responsibility, free market solutions, and limited government intervention. It tends to view economic and social issues through the lens of traditional values and fiscal restraint.",
        "confidence": "medium"
    },
    "claims": {
        "factual_claims": [
            {
                "claim_topic": "Government Spending",
                "claim_statement": "Federal spending has increased by 30% over the past five years.",
                "quote_from_article": "Federal expenditures have ballooned by 30% in just five years, far outpacing inflation and population growth.",
                "significance_rationale": "This claim establishes the article's central concern about government fiscal policy."
            },
            {
                "claim_topic": "National Debt",
                "claim_statement": "The national debt has reached $30 trillion for the first time in U.S. history.",
                "quote_from_article": "With the national debt now exceeding $30 trillion for the first time in American history, each taxpayer's share stands at approximately $242,000.",
                "significance_rationale": "This statistic quantifies the scale of government debt and personalizes it for readers."
            },
            {
                "claim_topic": "Economic Growth",
                "claim_statement": "Regulatory reductions in 2017-2019 contributed to economic growth and lower unemployment before the pandemic.",
                "quote_from_article": "The regulatory reductions implemented between 2017 and 2019 contributed to robust economic growth and the lowest unemployment rates in 50 years prior to the pandemic.",
                "significance_rationale": "This claim supports the article's position on the economic benefits of reduced regulation."
            }
        ]
    },
    "report": {
        "bias_analysis": {
            "detailed_findings": [
                {
                    "dimension": "Framing",
                    "observation": "Government overreach framing",
                    "explanation": "The article consistently frames economic challenges as resulting from excessive government intervention rather than market failures or structural inequalities.",
                    "quote_evidence": "The heavy hand of government continues to stifle innovation and burden taxpayers with unsustainable spending commitments.",
                    "impact": "This framing directs readers toward skepticism of government solutions to economic problems."
                },
                {
                    "dimension": "Source Selection",
                    "observation": "Business-oriented expert emphasis",
                    "explanation": "Most cited experts are associated with business organizations or conservative think tanks advocating for limited government.",
                    "quote_evidence": "According to Richard Hanson of the National Federation of Independent Business, 'Small businesses are drowning in regulatory compliance costs that prevent job creation.'",
                    "impact": "Presents business-friendly economic analysis as the primary authoritative perspective."
                },
                {
                    "dimension": "Language",
                    "observation": "Fiscally cautionary terminology",
                    "explanation": "Uses alarming language when describing government spending, debt, and regulations.",
                    "quote_evidence": "Reckless spending threatens to saddle future generations with crippling debt and economic stagnation.",
                    "impact": "Evokes concern about fiscal issues rather than purely analytical assessment."
                },
                {
                    "dimension": "Context",
                    "observation": "Selective economic context",
                    "explanation": "Provides context for regulatory burden and debt figures but omits data on social program outcomes and market failures.",
                    "evidence": "The article discusses regulatory compliance costs but doesn't mention environmental or consumer protection benefits of regulations.",
                    "impact": "Creates an impression of more uniformly negative government impact than a more complete context might suggest."
                },
                {
                    "dimension": "Perspective Balance",
                    "observation": "Limited progressive viewpoints",
                    "explanation": "Minimal presentation of perspectives supporting government intervention or addressing market failures.",
                    "evidence": "No sources from progressive economists, labor organizations, or consumer advocates are included.",
                    "impact": "Readers receive limited exposure to alternative economic viewpoints on the topic."
                }
            ],
            "overall_assessment": "The article exhibits a center-right bias through its emphasis on government spending concerns, regulatory burden narratives, and free market solutions. While it presents factual information about budget figures and economic indicators, it selectively emphasizes data points that align with fiscal conservative perspectives while giving less attention to potential benefits of government programs or market failures.",
            "overall_bias_level": "Moderate",
            "dimension_summaries": {
                "Framing": {
                    "status": "Biased",
                    "summary": "Issues are predominantly framed as government overreach requiring market-based solutions and fiscal restraint."
                },
                "Source Selection": {
                    "status": "Biased",
                    "summary": "Expert sources cited lean toward conservative economists and business advocates."
                },
                "Language": {
                    "status": "Caution",
                    "summary": "Employs concerned language when describing government spending and debt."
                },
                "Context": {
                    "status": "Caution",
                    "summary": "Provides some economic context but omits certain social impact considerations."
                },
                "Perspective Balance": {
                    "status": "Biased",
                    "summary": "Limited presentation of progressive economic viewpoints."
                }
            }
        }
    }
};

// Mock history items
const mockHistoryItems = [
    {
        id: "job-001",
        url: "https://example.com/article-1",
        date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        title: "Mark Carney Attacks Trump in Victory Speech",
        slant: "Liberal/Progressive"
    },
    {
        id: "job-002",
        url: "https://example.com/article-2",
        date: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
        title: "Climate Change: New Research Findings",
        slant: "Academic/Scientific"
    },
    {
        id: "job-003",
        url: "https://example.com/article-3",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        title: "Economic Outlook for Next Quarter Shows Growth",
        slant: "Business-oriented"
    }
];

// Top stories for the explore page

// Mock article preview data
const mockArticlePreviews: Record<string, {
    success: boolean;
    title: string;
    source: string;
    author: string;
    imageUrl: string;
    description: string;
    url: string;
}> = {
    default: {
        success: true,
        title: "Kann uns Trump das Internet abschalten?",
        source: "Der Spiegel",
        author: "Matthias Kolb",
        imageUrl: "https://picsum.photos/seed/default/800/400",
        description: "Donald Trump hat das nicht davon abgehalten, bereits kurz vor seiner ersten Amtszeit darüber zu sinnieren, »Teile des Internets abzuschalten«.",
        url: "https://spiegel.de"
    },

    "job-001": {
        success: true,
        title: "Kann uns Trump das Internet abschalten?",
        source: "Der Spiegel",
        author: "Matthias Kolb",
        imageUrl: "https://picsum.photos/seed/job001/800/400",
        description: "Donald Trump hat das nicht davon abgehalten, bereits kurz vor seiner ersten Amtszeit darüber zu sinnieren, »Teile des Internets abzuschalten«.",
        url: "https://example.com/article-1"
    },

    "job-002": {
        success: true,
        title: "Climate Change: New Research Findings",
        source: "Science Daily",
        author: "Dr. Michael Chen",
        imageUrl: "https://picsum.photos/seed/job002/800/400",
        description: "Recent scientific studies reveal accelerating climate change impacts across global ecosystems.",
        url: "https://example.com/article-2"
    },

    "job-003": {
        success: true,
        title: "Economic Outlook for Next Quarter Shows Growth",
        source: "Financial Times",
        author: "Sarah Johnson",
        imageUrl: "https://picsum.photos/seed/job003/800/400",
        description: "Leading economists predict steady growth despite recent market uncertainties.",
        url: "https://example.com/article-3"
    }
};

// Mock job data for different job IDs
const mockJobData = {
    'mock-job-123': {
        id: 'mock-job-123',
        url: 'https://example.com/article-1',
        status: 'Complete',
        language: 'en',
        job_details: {
            title: 'Kann uns Trump das Internet abschalten?',
            text: 'Donald Trump hat das nicht davon abgehalten, bereits kurz vor seiner ersten Amtszeit darüber zu sinnieren, »Teile des Internets abzuschalten«. Die Schwachstellendatenbank hat nämlich selbst eine Schwachstelle: Ihr Betrieb hängt an jährlichen Verträgen, bezahlt von der US-Regierung.',
            images: [
                {
                    url: 'https://picsum.photos/800/400?random=1',
                    width: 800,
                    height: 400,
                    primary: true
                }
            ],
            author: 'Matthias Kolb',
            siteName: 'Der Spiegel',
            description: 'An analysis of internet infrastructure dependencies',
        },
        analysis_results: exampleAnalysisData,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 min ago
    },
    'mock-job-124': {
        id: 'mock-job-124',
        url: 'https://example.com/article-2',
        status: 'Complete',
        language: 'en',
        job_details: {
            title: 'Government Spending Analysis',
            text: 'This article examines recent government spending policies...',
            images: [
                {
                    url: 'https://picsum.photos/800/400?random=2',
                    width: 800,
                    height: 400,
                    primary: true
                }
            ],
            author: 'Jane Doe',
            siteName: 'Policy Review',
            description: 'An in-depth look at fiscal policies',
        },
        analysis_results: secondExampleData,
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
        updated_at: new Date(Date.now() - 1000 * 60 * 110).toISOString() // 110 min ago
    },
    'mock-job-archive': {
        id: 'mock-job-archive',
        url: 'https://example.com/archived-article',
        status: 'Complete',
        language: 'en',
        job_details: {
            title: 'Archived News Article',
            text: 'This is an example of an article retrieved via archive.is...',
            images: [
                {
                    url: null,
                    originalUrl: 'https://dcgrjpv62581mc.archive.is/zJc2u/2a899c36bb4f77bd5f3ed4f0e4801ceb4eff696a.webp',
                    width: 1200,
                    height: 630,
                    primary: true,
                    isArchiveImage: true
                }
            ],
            author: 'Archive Author',
            siteName: 'Archive News',
            description: 'An archived article from a news source',
        },
        analysis_results: exampleAnalysisData,
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
        updated_at: new Date(Date.now() - 1000 * 60 * 170).toISOString() // 170 min ago
    },
    'default': {
        id: 'default-job',
        url: 'https://example.com/default-article',
        status: 'Queued',
        language: 'en',
        job_details: null,
        analysis_results: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
};

// Mock API implementation for development
const mockApi = {
    submitUrl: async (url: string, locale: string = 'en') => {
        console.log('MOCK API: Submitting URL with locale:', { url, locale });

        // For specific test URLs, simulate returning an existing analysis
        if (url.includes('reuse') || url.includes('existing')) {
            console.log('MOCK API: Returning existing analysis for URL:', url);

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Generate current timestamp
            const now = new Date();
            const minutesAgo10 = new Date(now.getTime() - 10 * 60 * 1000);

            // Return a 200 OK with existingAnalysis data
            return {
                status: 200,
                statusText: 'OK',
                data: {
                    jobId: `mock-existing-job-${Date.now()}`,
                    url: url,
                    language: locale,
                    existingAnalysis: true,
                    analysis_results: url.includes('conservative') ? secondExampleData : exampleAnalysisData,
                    article_title: 'Kann uns Trump das Internet abschalten?',
                    article_author: 'Matthias Kolb',
                    article_source_name: 'Der Spiegel',
                    article_canonical_url: url,
                    article_preview_image_url: 'https://picsum.photos/800/400?random=1',
                    article_text: 'Donald Trump hat das nicht davon abgehalten, bereits kurz vor seiner ersten Amtszeit darüber zu sinnieren, »Teile des Internets abzuschalten«. Die Schwachstellendatenbank hat nämlich selbst eine Schwachstelle: Ihr Betrieb hängt an jährlichen Verträgen, bezahlt von der US-Regierung.',
                    created_at: minutesAgo10.toISOString(),
                    analyzed_at: now.toISOString()
                },
                headers: {},
                config: {} as AxiosRequestConfig,
            };
        }

        // For all other URLs, generate a new job
        // Generate a mock job ID
        const jobId = `mock-job-${Date.now()}`;

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Create a mock AxiosResponse-like object
        return {
            status: 202, // 202 Accepted for new job
            statusText: 'Accepted',
            data: {
                message: 'Job submitted successfully',
                jobId,
            },
            headers: {},
            config: {} as AxiosRequestConfig,
        };
    },

    // Get the status of a job
    getJobStatus: async (jobId: string) => {
        console.log(`[MOCK API] Getting status for job: ${jobId}`);
        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return transformToProxiedImageUrls(mockJobData[jobId as keyof typeof mockJobData] || mockJobData['default']);
    },

    // Get preview information about an article
    getJobPreview: async (jobId: string) => {
        console.log(`[MOCK API] Getting preview for job: ${jobId}`);
        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 400));

        // Look up the mock article preview
        let preview;
        if (jobId === 'mock-job-123') {
            preview = mockArticlePreviews[0];
        } else if (jobId === 'mock-job-124') {
            preview = mockArticlePreviews[1];
        } else {
            // Default
            preview = mockArticlePreviews[0];
        }

        // Return mock preview with proxied image URLs
        return transformToProxiedImageUrls({
            ...preview
        });
    },

    // Get the results of a completed job
    getJobResults: async (jobId: string) => {
        console.log(`[MOCK API] Getting results for job: ${jobId}`);
        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 600));

        // Select the example based on job ID for variety
        if (jobId === 'mock-job-123') {
            return exampleAnalysisData;
        } else if (jobId === 'mock-job-124') {
            return secondExampleData;
        } else {
            return exampleAnalysisData;
        }
    },

    // Get history of completed jobs
    getHistory: async () => {
        console.log('[MOCK API] Getting history');
        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 400));
        return mockHistoryItems;
    },

    // Image proxy endpoint
    getImageProxy: (encodedUrl: string) => {
        console.log(`[MOCK API] Proxying image: ${encodedUrl}`);
        // This endpoint would normally return the image data
        // For mock purposes, we just return the URL since it's handled client-side
        return `/api/image-proxy?url=${encodedUrl}`;
    }
};

// Mock implementation of the socket client for real-time updates
export const mockSocketClient = {
    subscribeToJob: (jobId: string, callback: (update: { jobId: string; status: string; message: string }) => void) => {
        // Simulate socket connection
        console.log(`MOCK SOCKET: Subscribed to job: ${jobId}`);

        // Simulate job updates with timeouts
        setTimeout(() => {
            console.log(`MOCK SOCKET: Updating status to Processing for job: ${jobId}`);
            callback({ jobId, status: 'Processing', message: 'Analyzing article content' });
        }, 1000);

        setTimeout(() => {
            console.log(`MOCK SOCKET: Updating status to Fetching for job: ${jobId}`);
            callback({ jobId, status: 'Fetching', message: 'Retrieving article content' });
        }, 2500);

        setTimeout(() => {
            console.log(`MOCK SOCKET: Updating status to Analyzing for job: ${jobId}`);
            callback({ jobId, status: 'Analyzing', message: 'Performing bias analysis' });
        }, 4000);

        setTimeout(() => {
            console.log(`MOCK SOCKET: Updating status to Complete for job: ${jobId}`);
            callback({ jobId, status: 'Complete', message: 'Analysis complete' });
        }, 6000);
    },

    unsubscribeFromJob: () => {
        console.log('MOCK SOCKET: Unsubscribed from job');
    },

    disconnectSocket: () => {
        console.log('MOCK SOCKET: Disconnected socket');
    }
};

// Mock image proxy function
function getImageProxy(url: string): string {
    // For mock purposes, we just ensure the URL is encoded properly
    const encodedUrl = encodeURIComponent(url);
    return `/api/image-proxy?url=${encodedUrl}`;
}

// Type-safe version of the transformToProxiedImageUrls function
function transformToProxiedImageUrls<T>(data: T): T {
    if (!data) return data;

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => transformToProxiedImageUrls(item)) as unknown as T;
    }

    // Handle objects
    if (typeof data === 'object') {
        const result = { ...data } as Record<string, unknown>;

        // Transform imageUrl property if it exists
        if ('imageUrl' in result && typeof result.imageUrl === 'string') {
            result.imageUrl = getImageProxy(result.imageUrl as string);
        }

        // Transform image objects in an images array
        if ('images' in result && Array.isArray(result.images)) {
            result.images = result.images.map((image: Record<string, unknown>) => {
                if (image && typeof image === 'object') {
                    // Handle Archive.is images (where url might be null but originalUrl exists)
                    if ('isArchiveImage' in image && image.isArchiveImage === true && 'originalUrl' in image && typeof image.originalUrl === 'string') {
                        return {
                            ...image,
                            url: getImageProxy(image.originalUrl as string)
                        };
                    }
                    // Handle regular images with url property
                    else if ('url' in image && typeof image.url === 'string') {
                        return {
                            ...image,
                            url: getImageProxy(image.url as string)
                        };
                    }
                }
                return image;
            });
        }

        // Recursively transform nested objects
        for (const key in result) {
            if (result[key] && typeof result[key] === 'object') {
                result[key] = transformToProxiedImageUrls(result[key]);
            }
        }

        return result as unknown as T;
    }

    // Return primitives unchanged
    return data;
}

// Create a default export object
const mockService = {
    api: mockApi,
    socketClient: mockSocketClient
};

export default mockService; 