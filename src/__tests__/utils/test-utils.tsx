import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { render } from '@testing-library/react';

// Common translations for tests
const commonMessages: any = {
    Common: {
        // Status badges
        status: {
            queued: 'Queued',
            processing: 'Processing',
            fetching: 'Fetching',
            analyzing: 'Analyzing',
            complete: 'Complete',
            failed: 'Failed',
        },

        // Section titles
        sectionTitle: {
            biasAnalysis: 'Bias Analysis',
            dimensionAnalysis: 'Dimension Analysis',
            factualClaims: 'Factual Claims',
            analysisResults: 'Analysis Results',
        },

        // Bias levels
        biasLevel: {
            low: 'Low',
            moderate: 'Moderate',
            high: 'High',
        },

        // Dimension names
        dimension: {
            emotionalLanguage: 'Emotional Language',
            sourceDiversity: 'Source Diversity',
            factualAccuracy: 'Factual Accuracy',
            perspectiveDiversity: 'Perspective Diversity',
        },

        // Labels
        label: {
            confidence: 'confidence',
            source: 'Source',
            claim: 'Claim',
        },

        // Slant categories
        slant: {
            liberalProgressive: 'Liberal/Progressive',
            conservative: 'Conservative',
            centristModerate: 'Centrist/Moderate',
            libertarian: 'Libertarian',
            populist: 'Populist',
            establishment: 'Establishment',
            nonpartisanNeutral: 'Nonpartisan/Neutral',
            businessOriented: 'Business-oriented',
            academicScientific: 'Academic/Scientific',
            advocacyIssueFocused: 'Advocacy/Issue-focused',
            other: 'Other'
        },

        // Direct keys
        biasAnalysis: 'Bias Analysis',
        dimensionAnalysis: 'Dimension Analysis',
        factualClaims: 'Factual Claims',
        analysisResults: 'Analysis Results',
        low: 'Low',
        moderate: 'Moderate',
        high: 'High',
        source: 'Source',
        copy: 'Copy',
        copied: 'Copied',

        // ShareableLink component
        shareThisAnalysis: 'Share this analysis',
        copyLink: 'Copy Link',
        linkCopiedToClipboard: 'Link copied to clipboard!',
        failedToCopyLink: 'Failed to copy link',
    },
    BiasScoreMeter: {
        title: 'Bias Analysis',
        biasScore: 'Bias Score',
        slantCategory: 'Slant Category',
        slantConfidence: 'Slant Confidence',
        overallAssessment: 'Overall Assessment',
        confidenceHigh: 'High confidence',
        confidenceMedium: 'Medium confidence',
        confidenceLow: 'Low confidence',
        confidence: 'confidence',
    },
    // SlantCategory translations for tests
    SlantCategory: {
        'Liberal/Progressive': 'Liberal/Progressive',
        'Conservative': 'Conservative',
        'Centrist/Moderate': 'Centrist/Moderate',
        'Libertarian': 'Libertarian',
        'Populist': 'Populist',
        'Establishment': 'Establishment',
        'Nonpartisan/Neutral': 'Nonpartisan/Neutral',
        'Business-oriented': 'Business-oriented',
        'Academic/Scientific': 'Academic/Scientific',
        'Advocacy/Issue-focused': 'Advocacy/Issue-focused',
        'Other': 'Other',
        'Unknown': 'Unknown'
    },
    // ConfidenceLevel translations for tests
    ConfidenceLevel: {
        'Low': 'Low',
        'Medium': 'Medium',
        'High': 'High',
        'Unknown': 'Unknown',
    },
    ClaimsDisplay: {
        title: 'Factual Claims',
        noClaims: 'No claims found',
        claimsIntro: 'The following factual claims were identified in the article:',
        significance: 'Significance:',
    },
    AnalysisCard: {
        title: 'Analysis Results',
        loading: 'Loading analysis...',
        error: 'Error loading analysis',
        noData: 'No analysis data available',
        imageUnavailable: 'Image unavailable',
    },
    UrlInput: {
        placeholder: 'Paste article URL for analysis ...',
        analyze: 'Analyze',
        analyzing: 'Analyzing',
        analyzeNew: 'Analyze New',
        tryAgain: 'Try Again',
        invalidUrl: 'Please enter a valid URL',
        error: 'Failed to submit URL. Please try again.'
    }
};

export function renderWithI18n(ui: React.ReactElement) {
    return render(
        <NextIntlClientProvider locale="en" messages={commonMessages}>
            {ui}
        </NextIntlClientProvider>
    );
} 