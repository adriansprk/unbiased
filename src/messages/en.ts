const messages = {
    // Common
    Common: {
        loading: 'Loading...',
        error: 'Error',
        retry: 'Retry',
        submit: 'Submit',
        cancel: 'Cancel',
        unknown: 'Unknown',
        // Common status values
        balanced: 'Balanced',
        caution: 'Caution',
        biased: 'Biased',
        low: 'Low',
        moderate: 'Moderate',
        high: 'High',
        // Common section titles
        biasAnalysis: 'Bias Analysis',
        dimensionAnalysis: 'Dimension Analysis',
        factualClaims: 'Factual Claims',
        analysisResults: 'Analysis Results',
        // Common labels
        source: 'Source:',
        summary: 'Summary',
        // ShareableLink component
        shareThisAnalysis: 'Share this analysis',
        copyLink: 'Copy Link',
        linkCopiedToClipboard: 'Link copied to clipboard!',
        failedToCopyLink: 'Failed to copy link',
        copy: 'Copy',
        copied: 'Copied',
    },
    // Header
    Header: {
        analyze: 'Analyze',
        language: 'Language',
    },
    // Language names for the switcher
    Languages: {
        en: 'English',
        de: 'German',
    },
    // URL Input
    UrlInput: {
        placeholder: 'Enter article URL...',
        submit: 'Analyze',
        invalidUrl: 'Please enter a valid URL',
        analyzing: 'Analyzing...',
        analyzeNew: 'Analyze New',
        tryAgain: 'Try Again',
        submitError: 'Failed to submit URL. Please try again.',
        verificationRequired: 'Please complete the verification challenge.',
        verificationError: 'Verification error. Please try again.',
        verificationFailed: 'Verification failed. Please refresh and try again.',
    },
    // Hero Section
    HeroSection: {
        title: 'Decode the News. Instantly.',
        subtitle: 'Tired of hidden agendas? Paste any article URL and let our AI instantly reveal its bias, factual claims, and true perspective.',
        badge: 'AI-Powered Insights',
    },
    // Analysis Card
    AnalysisCard: {
        imageUnavailable: 'Image unavailable',
        articleTitle: 'Article title',
        source: 'Source',
        author: 'Author',
        overallBiasLevel: 'Overall Bias Level',
        viewFullAnalysis: 'View Full Analysis',
        biasAnalysis: 'Bias Analysis',
        factualClaims: 'Factual Claims',
        analysisResults: 'Analysis Results',
        dimensionAnalysis: 'Dimension Analysis',
        unknownError: 'An unknown error occurred',
        timedOut: 'This analysis took too long and was stopped. Please submit the article again.',
        analysisFailed: 'This analysis could not be completed. Please submit the article again.',
        contentUnavailable: "We couldn't get the full text of this article. Paywalled articles can only be analyzed once a complete archived copy exists, so please try again later.",
    },
    // Status Messages
    Status: {
        queued: 'Queued',
        processing: 'Processing',
        fetching: 'Fetching',
        analyzing: 'Analyzing',
        complete: 'Complete',
        failed: 'Failed',
        loading: 'Loading',
    },
    // Bias Levels
    BiasLevel: {
        low: 'Low',
        moderate: 'Moderate',
        high: 'High',
    },
    // Dimension Status
    DimensionStatus: {
        biased: 'Biased',
        caution: 'Caution',
        balanced: 'Balanced',
    },
    // Bias Dimensions
    BiasDimension: {
        framing: 'Framing',
        sourceSelection: 'Source Selection',
        language: 'Language',
        context: 'Context',
        perspectiveBalance: 'Perspective Balance',
    },
    // Recent Analyses
    RecentAnalyses: {
        title: 'Freshly Analyzed',
        noAnalyses: 'No recent analyses',
    },
    // Error Messages
    ErrorMessages: {
        fetchFailed: 'Failed to fetch article',
        analysisFailed: 'Analysis failed',
        invalidUrl: 'Invalid URL',
        serverError: 'Server error',
        unknownError: 'Unknown error',
    },
    // Skeleton Loader
    AnalysisProgress: {
        title: 'Analyzing article',
        newAnalysis: 'New analysis',
        queued: 'Waiting to start...',
        fetch: 'Fetching the article',
        fetchDetail: 'Reading the article text...',
        fetchArchive: 'Fetching the article via the archive',
        fetchArchiveDetail: 'This site has a paywall, so we read an archived copy...',
        analyze: 'AI analysis',
        hintType: 'Working out what kind of article this is...',
        hintActors: 'Looking at how the people involved are portrayed...',
        hintClaims: 'Extracting factual claims...',
        hintTone: 'Checking word choice and tone...',
        hintSources: 'Weighing the sources quoted...',
        hintHeadline: 'Comparing the headline with the text...',
        results: 'Results',
    },
    SkeletonLoader: {
        analysisResults: 'Analysis Results',
        biasAnalysis: 'Bias Analysis',
        dimensionAnalysis: 'Dimension Analysis',
        factualClaims: 'Factual Claims',
        waitingInQueue: 'Waiting in queue...',
        preparingAnalysis: 'Preparing analysis...',
        retrievingContent: 'Retrieving content...',
        loading: 'Loading...',
        preparingAnalysisTitle: 'Preparing Analysis',
        startingAnalysisTitle: 'Starting Analysis Process',
        gatheringContentTitle: 'Gathering Article Content',
        preparingAnalysisDesc: 'Once processing begins, we will analyze the article for bias across multiple dimensions.',
        startingAnalysisDesc: 'We will soon begin extracting content from the article for analysis.',
        gatheringContentDesc: 'After content extraction, the AI will analyze the article for factual claims and bias.',

    },
    // Metadata
    Metadata: {
        title: "Unbias: Decode the News Instantly - AI Bias & Fact Analysis",
        description: "Tired of hidden agendas? Unbias uses AI to instantly reveal bias, factual claims, and true perspective in any news article. Decode the news today.",
        keywords: "decode news, AI news analysis, bias detection, media bias, factual claims, article analyzer, unbiased news, perspective tool, media literacy, instant analysis",
        ogTitle: "Unbias: Decode the News. Instantly.",
        ogDescription: "Tired of hidden agendas? Paste any article URL and let our AI instantly reveal its bias, factual claims, and true perspective. Get clarity now.",
        twitterTitle: "Unbias: Decode the News. Instantly.",
        twitterDescription: "Hidden agendas? Unbias uses AI to reveal bias, factual claims & true perspective in any article. Your tool for instant news clarity.",
    },
    // Claims Display
    ClaimsDisplay: {
        title: 'Factual Claims',
        noClaims: 'No factual claims were identified in this article.',
        source: 'Source:',
        significance: 'Significance:',
    },
    // UnifiedDimensionAnalysis
    UnifiedDimensionAnalysis: {
        noFindings: 'No specific findings for this dimension.',
        observation: 'Observation',
        explanation: 'Explanation',
        evidence: 'Evidence',
        omission: 'Nothing to quote: this is about something the article leaves out.',
        balanced: 'Balanced',
        caution: 'Caution',
        biased: 'Biased',
        unknown: 'Unknown',
    },
    ArticleType: {
        news: 'News',
        analysis: 'Analysis',
        opinion: 'Opinion',
        interview: 'Interview',
        other: 'Other',
        rationale: 'Why this article type',
        opinionNote: 'Opinion pieces argue a position. They are judged on whether they treat facts and opposing views fairly, not on neutrality.',
    },
    Dimension: {
        word_choice: 'Word Choice / Tone',
        framing: 'Framing / Emphasis',
        sources: 'Source Selection',
        balance: 'Fairness / Balance',
        headline: 'Headline / Title Bias',
    },
    Actors: {
        title: 'How the article portrays those involved',
        intro: "Judged by the article's own voice, not by what quoted sources say.",
        favorable: 'Favorable',
        neutral: 'Neutral',
        critical: 'Critical',
    },
    // Add SharedAnalysis namespace
    SharedAnalysis: {
        sharedAnalysisTitle: 'Shared Analysis Results',
        loadingSharedAnalysis: 'Loading Shared Analysis...',
        error: 'Failed to load shared analysis',
        analysisNotFound: 'Analysis Not Found',
        analysisNotFoundDetails: 'The analysis could not be retrieved. It may have been removed or the link is incorrect.',
        analysisFailed: 'Analysis Failed',
        analysisFailedDetails: 'This analysis could not be completed.',
        analyzeYourOwn: 'Want to analyze your own article?',
        tryItYourself: 'Try it yourself'
    },
};

export default messages; 