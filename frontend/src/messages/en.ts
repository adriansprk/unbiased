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
        // Common dimension names
        sourceSelection: 'Source Selection',
        fairnessBalance: 'Fairness / Balance',
        framingEmphasis: 'Framing / Emphasis',
        wordChoiceTone: 'Word Choice / Tone',
        headlineTitleBias: 'Headline / Title Bias',
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
        slantCategory: 'Slant Category',
        confidence: 'Confidence',
        overallBiasLevel: 'Overall Bias Level',
        rationale: 'Rationale',
        viewFullAnalysis: 'View Full Analysis',
        biasAnalysis: 'Bias Analysis',
        factualClaims: 'Factual Claims',
        analysisResults: 'Analysis Results',
        dimensionAnalysis: 'Dimension Analysis',
        analysisDataIncomplete: 'Analysis data is incomplete',
        dimensionDataInvalid: 'Dimension data format is invalid',
        errorDisplayingBias: 'Error displaying bias score',
        errorDisplayingDimension: 'Error displaying dimension analysis',
        unknownError: 'An unknown error occurred',
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
    // Slant Categories
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
        'Unknown': 'Unknown',
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
        context: 'Context:',
    },
    // BiasScoreMeter
    BiasScoreMeter: {
        title: 'Bias Analysis',
        low: 'Low',
        moderate: 'Moderate',
        high: 'High',
        unknown: 'Unknown',
        confidence: 'confidence',
        summary: 'Summary',
        slantRationale: 'Slant Rationale',
    },
    // Confidence Levels
    ConfidenceLevel: {
        'Low': 'Low',
        'Medium': 'Medium',
        'High': 'High',
        'Unknown': 'Unknown',
    },
    // UnifiedDimensionAnalysis
    UnifiedDimensionAnalysis: {
        noDimensionData: 'No dimension data available',
        noFindings: 'No specific findings for this dimension.',
        observation: 'Observation',
        explanation: 'Explanation',
        evidence: 'Evidence',
        source: 'Source:',
        impact: 'Impact',
        omission: 'N/A - Omission',
        balanced: 'Balanced',
        caution: 'Caution',
        biased: 'Biased',
        unknown: 'Unknown',
        // Dimension names
        sourceSelection: 'Source Selection',
        fairnessBalance: 'Fairness / Balance',
        framingEmphasis: 'Framing / Emphasis',
        wordChoiceTone: 'Word Choice / Tone',
        headlineTitleBias: 'Headline / Title Bias',
    },
    // Add SharedAnalysis namespace
    SharedAnalysis: {
        sharedAnalysisTitle: 'Shared Analysis Results',
        loadingSharedAnalysis: 'Loading Shared Analysis...',
        analyzeUrlTitle: 'Analyze Another URL',
        error: 'Failed to load shared analysis',
        analysisNotFound: 'Analysis Not Found',
        analysisNotFoundDetails: 'The analysis could not be retrieved. It may have been removed or the link is incorrect.',
        analysisFailed: 'Analysis Failed',
        analysisFailedDetails: 'This analysis could not be completed.',
        tryNewAnalysis: 'Start a new analysis with the form above.',
        analyzeYourOwn: 'Want to analyze your own article?',
        tryItYourself: 'Try it yourself'
    },
};

export default messages; 