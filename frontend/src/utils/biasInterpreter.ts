/**
 * Utility for interpreting and extracting bias analysis data from the backend
 * 
 * API Implementation Best Practices:
 * 
 * 1. Separate endpoints for different concerns:
 *   - /api/status/{jobId} - For checking job status and lightweight updates during processing
 *   - /api/results/{jobId} - For retrieving the complete analysis results when job is complete
 * 
 * 2. Status endpoint should:
 *   - Return lightweight status updates (queued, processing, complete, failed)
 *   - Include minimal metadata (job ID, URL, timestamps)
 *   - Optionally include progress indicators
 *   - Should be fast and cacheable
 * 
 * 3. Results endpoint should:
 *   - Only be called when status is "Complete"
 *   - Return the full analysis results
 *   - Can be heavier and more detailed
 *   - May have different caching and rate limiting rules
 * 
 * The current implementation uses a fallback mechanism where it first tries the dedicated
 * results endpoint, and if that fails, it falls back to the status endpoint. This approach
 * allows for backward compatibility during the transition to a fully separated API design.
 */

import { AnalysisData, BiasLevel, DimensionStatus } from "@/types/analysis";
import logger from "@/utils/logger";

// Re-export types for external use
export type { DimensionStatus, BiasLevel } from "@/types/analysis";

// Define types for extracted and validated data
export interface BiasInterpretation {
    overallBiasLevel: BiasLevel;
    dimensionStatuses: Record<string, DimensionStatus>;
    slantCategory: string;
    slantConfidence: string;
}

/**
 * Safely accesses a nested property and returns a default value if not found
 * This is particularly useful for handling potentially undefined properties in API responses
 */
function safeGet<T>(obj: unknown, path: string[], defaultValue: T): T {
    try {
        let current: unknown = obj;
        for (const key of path) {
            if (current === null || current === undefined || typeof current !== 'object') {
                logger.debug(`Path segment '${key}' not found in object, returning default value`, defaultValue);
                return defaultValue;
            }
            current = (current as Record<string, unknown>)[key];
        }
        return (current === null || current === undefined) ? defaultValue : current as T;
    } catch (e) {
        logger.error(`Error accessing path ${path.join('.')}:`, e);
        return defaultValue;
    }
}

/**
 * Interprets the analysis data to extract and validate important values with fallbacks
 * 
 * @param analysisData - The raw analysis data from the API
 * @returns A normalized and validated interpretation of the bias analysis
 */
export function interpretBiasAnalysis(analysisData: AnalysisData | null): BiasInterpretation {
    if (!analysisData) {
        logger.error('Missing analysis data in interpretBiasAnalysis');
        throw new Error('Analysis data is required for interpretation');
    }

    try {
        logger.debug('Interpreting bias analysis from data:',
            analysisData.report && analysisData.report.bias_analysis
                ? 'Has bias_analysis data'
                : 'Missing bias_analysis data');

        // Extract bias level from the backend data
        const overallBiasLevel = getOverallBiasLevel(analysisData);

        // Extract dimension status information
        const dimensionStatuses = getDimensionStatuses(analysisData);

        // Extract slant information with fallbacks
        const slantCategory = safeGet(analysisData, ['slant', 'category'], 'Unknown');
        const slantConfidence = safeGet(analysisData, ['slant', 'confidence'], 'Low');

        logger.debug('Bias interpretation complete:', {
            overallBiasLevel,
            dimensionStatusesCount: Object.keys(dimensionStatuses).length,
            slantCategory,
            slantConfidence
        });

        return {
            overallBiasLevel,
            dimensionStatuses,
            slantCategory,
            slantConfidence
        };
    } catch (error) {
        logger.error('Error in interpretBiasAnalysis:', error);
        // Return sensible defaults if processing fails
        return {
            overallBiasLevel: 'Low',
            dimensionStatuses: {},
            slantCategory: 'Unknown',
            slantConfidence: 'Low'
        };
    }
}

/**
 * Gets the overall bias level from the analysis data
 * Uses multiple fallback strategies if the primary method fails
 */
function getOverallBiasLevel(analysisData: AnalysisData): BiasLevel {
    try {
        // First try to get the direct overall_bias_level field
        const directBiasLevel = safeGet(analysisData, ['report', 'bias_analysis', 'overall_bias_level'], null);

        // If we have a valid bias level directly from the backend, use it
        if (directBiasLevel && ['Low', 'Moderate', 'High'].includes(directBiasLevel as string)) {
            logger.debug('Using direct bias level from backend:', directBiasLevel);
            return directBiasLevel as BiasLevel;
        }

        // Fallback 1: Try to interpret from the overall assessment
        const overallAssessment = safeGet(analysisData, ['report', 'bias_analysis', 'overall_assessment'], '');

        if (overallAssessment) {
            logger.debug('Trying to interpret bias level from assessment text');
            // Look for keywords in the assessment
            const lowerAssessment = String(overallAssessment).toLowerCase();
            if (lowerAssessment.includes('high bias') || lowerAssessment.includes('highly biased') ||
                lowerAssessment.includes('extreme') || lowerAssessment.includes('strong bias')) {
                return 'High';
            } else if (lowerAssessment.includes('moderate bias') || lowerAssessment.includes('some bias') ||
                lowerAssessment.includes('mild bias') || lowerAssessment.includes('partially biased')) {
                return 'Moderate';
            } else if (lowerAssessment.includes('low bias') || lowerAssessment.includes('minimal bias') ||
                lowerAssessment.includes('slight bias') || lowerAssessment.includes('balanced')) {
                return 'Low';
            }
        }

        // Fallback 2: Default based on dimension statuses
        const dimensionStatuses = getDimensionStatuses(analysisData);
        const statusCounts = Object.values(dimensionStatuses).reduce((counts, status) => {
            counts[status] = (counts[status] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);

        logger.debug('Determining bias level from dimension statuses:', statusCounts);

        // Logic to determine overall bias from dimension statuses
        if ((statusCounts['Biased'] || 0) >= 2) {
            return 'High';
        } else if ((statusCounts['Biased'] || 0) >= 1 || (statusCounts['Caution'] || 0) >= 2) {
            return 'Moderate';
        } else {
            return 'Low';
        }
    } catch (error) {
        logger.error('Error determining overall bias level:', error);
        return 'Low'; // Default fallback
    }
}

/**
 * Extracts dimension statuses from the analysis data with fallbacks
 * Returns a dictionary mapping dimension names to their status values
 */
function getDimensionStatuses(analysisData: AnalysisData): Record<string, DimensionStatus> {
    try {
        const dimensionSummaries = safeGet(analysisData, ['report', 'bias_analysis', 'dimension_summaries'], {});
        const result: Record<string, DimensionStatus> = {};

        // Safety check if dimensionSummaries is valid
        if (!dimensionSummaries || typeof dimensionSummaries !== 'object') {
            logger.warn('Invalid dimension_summaries format:', dimensionSummaries);
            return {};
        }

        // Extract status from each dimension
        Object.entries(dimensionSummaries).forEach(([dimension, summary]) => {
            try {
                if (summary && typeof summary === 'object' && 'status' in summary) {
                    const status = summary.status;

                    // Validate it's a valid DimensionStatus
                    if (['Balanced', 'Caution', 'Biased', 'Unknown'].includes(status as string)) {
                        result[dimension] = status as DimensionStatus;
                    } else {
                        logger.warn(`Invalid status for dimension ${dimension}: ${status}`);
                        result[dimension] = 'Unknown';
                    }
                } else {
                    logger.warn(`Missing or invalid summary for dimension ${dimension}`);
                    result[dimension] = 'Unknown';
                }
            } catch (err) {
                logger.error(`Error processing dimension ${dimension}:`, err);
                result[dimension] = 'Unknown';
            }
        });

        logger.debug('Extracted dimension statuses:', result);
        return result;
    } catch (error) {
        logger.error('Error extracting dimension statuses:', error);
        return {};
    }
} 