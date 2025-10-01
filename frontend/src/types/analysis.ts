// Define types for bias analysis
export type BiasLevel = "Low" | "Moderate" | "High";
export type DimensionStatus = "Balanced" | "Caution" | "Biased" | "Unknown";

export interface FactualClaim {
    claim_topic: string;
    claim_statement: string;
    quote_from_article: string;
    significance_rationale: string;
}

export interface BiasObservation {
    dimension: string;
    observation?: string;
    explanation?: string;
    quote_evidence?: string;
    evidence?: string;
    impact?: string;
}

export interface DimensionSummary {
    summary: string;
    status: string;
}

export interface DimensionSummaries {
    [key: string]: DimensionSummary;
}

// Debug utility function to help trace log sources
export const debugLog = (context: string, message: string, ...data: unknown[]) => {
    console.log(`DEBUG [${context}]: ${message}`, ...data);
};

export interface AnalysisData {
    slant: {
        category: string;
        rationale: string;
        confidence: string | number;
    };
    claims: {
        factual_claims: Array<{
            claim_topic?: string;
            claim_statement?: string;
            quote_from_article?: string;
            significance_rationale?: string;
            claim?: string;
            is_factual?: boolean;
            context?: string;
        }>;
    };
    report: {
        bias_analysis: {
            overall_assessment: string;
            overall_bias_level: string;
            dimension_summaries: Record<string, DimensionSummary>;
            detailed_findings: Array<{
                dimension: string;
                evidence?: string;
                observation?: string;
                quote_evidence?: string;
                explanation?: string;
                impact?: string;
            }>;
        };
    };
}

export interface HistoryItem {
    id: string;
    url: string;
    date: string;
    title: string;
    slant: string;
}

export interface JobUpdate {
    jobId: string;
    status: string;
    message?: string;
    error?: string;
    errorMessage?: string;
    progressMessage?: string; // Detailed progress message during long operations
} 