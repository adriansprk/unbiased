const messages = {
    // Common
    Common: {
        loading: 'Wird geladen...',
        error: 'Fehler',
        retry: 'Wiederholen',
        submit: 'Absenden',
        cancel: 'Abbrechen',
        unknown: 'Unbekannt',
        // Common status values
        balanced: 'Ausgewogen',
        caution: 'Vorsicht',
        biased: 'Voreingenommen',
        low: 'Niedrig',
        moderate: 'Moderat',
        high: 'Hoch',
        // Common section titles
        biasAnalysis: 'Bias-Analyse',
        dimensionAnalysis: 'Dimensionsanalyse',
        factualClaims: 'Faktische Behauptungen',
        analysisResults: 'Analyseergebnisse',
        // Common dimension names
        sourceSelection: 'Quellenauswahl',
        fairnessBalance: 'Gleichgewicht',
        framingEmphasis: 'Rahmensetzung',
        wordChoiceTone: 'Wortwahl',
        headlineTitleBias: 'Schlagzeile',
        // Common labels
        source: 'Quelle:',
        summary: 'Zusammenfassung',
        // ShareableLink component
        shareThisAnalysis: 'Diese Analyse teilen',
        copyLink: 'Link kopieren',
        linkCopiedToClipboard: 'Link in die Zwischenablage kopiert!',
        failedToCopyLink: 'Fehler beim Kopieren des Links',
        copy: 'Kopieren',
        copied: 'Kopiert',
    },
    // Header
    Header: {
        analyze: 'Analysieren',
        language: 'Sprache',
    },
    // Language names for the switcher
    Languages: {
        en: 'Englisch',
        de: 'Deutsch',
    },
    // URL Input
    UrlInput: {
        placeholder: 'Artikel-URL eingeben...',
        submit: 'Analysieren',
        invalidUrl: 'Bitte geben Sie eine gültige URL ein',
        analyzing: 'Wird analysiert...',
        analyzeNew: 'Neu analysieren',
        tryAgain: 'Erneut versuchen',
        submitError: 'URL konnte nicht übermittelt werden. Bitte versuchen Sie es erneut.',
        verificationRequired: 'Bitte schließen Sie die Verifizierung ab.',
        verificationError: 'Verifizierungsfehler. Bitte versuchen Sie es erneut.',
        verificationFailed: 'Verifizierung fehlgeschlagen. Bitte aktualisieren Sie die Seite und versuchen Sie es erneut.',
    },
    // Hero Section
    HeroSection: {
        title: 'Bias oder Fakten?',
        subtitle: 'Schluss mit Raten. Unsere KI trennt Meinung von Fakten.',
        badge: 'KI-gestützte Analyse',
    },
    // Analysis Card
    AnalysisCard: {
        imageUnavailable: 'Bild nicht verfügbar',
        articleTitle: 'Artikeltitel',
        source: 'Quelle',
        author: 'Autor',
        slantCategory: 'Politische Ausrichtung',
        confidence: 'Konfidenz',
        overallBiasLevel: 'Bias-Niveau',
        rationale: 'Begründung',
        viewFullAnalysis: 'Vollständige Analyse anzeigen',
        biasAnalysis: 'Bias-Analyse',
        factualClaims: 'Faktische Behauptungen',
        analysisResults: 'Analyseergebnisse',
        dimensionAnalysis: 'Dimensionsanalyse',
        analysisDataIncomplete: 'Analysedaten sind unvollständig',
        dimensionDataInvalid: 'Dimensionsdatenformat ist ungültig',
        errorDisplayingBias: 'Fehler bei der Anzeige des Bias-Scores',
        errorDisplayingDimension: 'Fehler bei der Anzeige der Dimensionsanalyse',
        unknownError: 'Ein unbekannter Fehler ist aufgetreten',
    },
    // Status Messages
    Status: {
        queued: 'In Warteschlange',
        processing: 'In Bearbeitung',
        fetching: 'Abrufen',
        analyzing: 'Analysieren',
        complete: 'Abgeschlossen',
        failed: 'Fehlgeschlagen',
        loading: 'Wird geladen',
    },
    // Slant Categories
    SlantCategory: {
        'Liberal/Progressive': 'Liberal/Progressiv',
        'Conservative': 'Konservativ',
        'Centrist/Moderate': 'Zentristisch/Moderat',
        'Libertarian': 'Libertär',
        'Populist': 'Populistisch',
        'Establishment': 'Establishment',
        'Nonpartisan/Neutral': 'Überparteilich/Neutral',
        'Business-oriented': 'Wirtschaftsorientiert',
        'Academic/Scientific': 'Wissenschaftlich',
        'Advocacy/Issue-focused': 'Interessenvertretung/Themenorientiert',
        'Other': 'Sonstige',
        'Unknown': 'Unbekannt',
    },
    // Bias Levels
    BiasLevel: {
        low: 'Niedrig',
        moderate: 'Moderat',
        high: 'Hoch',
    },
    // Dimension Status
    DimensionStatus: {
        biased: 'Voreingenommen',
        caution: 'Vorsicht',
        balanced: 'Ausgewogen',
    },
    // Bias Dimensions
    BiasDimension: {
        framing: 'Rahmensetzung',
        sourceSelection: 'Quellenauswahl',
        language: 'Sprache',
        context: 'Kontext',
        perspectiveBalance: 'Ausgewogenheit',
    },
    // Recent Analyses
    RecentAnalyses: {
        title: 'Kürzlich Analysiert',
        noAnalyses: 'Keine kürzlichen Analysen',
    },
    // Error Messages
    ErrorMessages: {
        fetchFailed: 'Artikel konnte nicht abgerufen werden',
        analysisFailed: 'Analyse fehlgeschlagen',
        invalidUrl: 'Ungültige URL',
        serverError: 'Serverfehler',
        unknownError: 'Unbekannter Fehler',
    },
    // Skeleton Loader
    SkeletonLoader: {
        analysisResults: 'Analyseergebnisse',
        biasAnalysis: 'Bias-Analyse',
        dimensionAnalysis: 'Dimensionsanalyse',
        factualClaims: 'Faktische Behauptungen',
        waitingInQueue: 'In Warteschlange...',
        preparingAnalysis: 'Analyse wird vorbereitet...',
        retrievingContent: 'Inhalte werden abgerufen...',
        loading: 'Wird geladen...',
        preparingAnalysisTitle: 'Analyse wird vorbereitet',
        startingAnalysisTitle: 'Analyseprozess wird gestartet',
        gatheringContentTitle: 'Artikelinhalte werden abgerufen',
        preparingAnalysisDesc: 'Sobald die Verarbeitung beginnt, analysieren wir den Artikel auf Voreingenommenheit in mehreren Dimensionen.',
        startingAnalysisDesc: 'Wir beginnen bald mit der Extraktion von Inhalten aus dem Artikel für die Analyse.',
        gatheringContentDesc: 'Nach der Inhaltsextraktion wird die KI den Artikel auf faktische Behauptungen und Voreingenommenheit analysieren.',

        // Progress messages
        lookingForArchive: 'Suche nach archivierter Version...',
        checkingIs: 'Prüfe archive.is...',
        checkingPh: 'Prüfe archive.ph...',
        checkingToday: 'Prüfe archive.today...',
        checkingMd: 'Prüfe archive.md (letzter Versuch)...',
        readingArchived: 'Lese archivierten Artikel...',
        fetchingContent: 'Lade Artikelinhalt...',
        analyzingAI: 'Analysiere Bias mit KI...',
    },
    // Metadata
    Metadata: {
        title: 'Unbiased: Entschlüsseln Sie Nachrichten sofort - KI Bias & Faktenanalyse',
        description: 'Müde von versteckten Agenden? Unbias nutzt KI, um sofort Voreingenommenheit, Faktenbehauptungen und wahre Perspektive in jedem Nachrichtenartikel aufzudecken. Entschlüsseln Sie die Nachrichten noch heute.',
        keywords: 'Nachrichten entschlüsseln, KI Nachrichtenanalyse, Bias-Erkennung, Medienvoreingenommenheit, Faktenbehauptungen, Artikelanalyse, unvoreingenommene Nachrichten, Perspektivenwerkzeug, Medienkompetenz, sofortige Analyse',
        ogTitle: 'Unbiaed: Entschlüsseln Sie die Nachrichten. Sofort.',
        ogDescription: 'Müde von versteckten Agenden? Fügen Sie eine beliebige Artikel-URL ein und lassen Sie unsere KI sofort deren Voreingenommenheit, Faktenbehauptungen und wahre Perspektive aufdecken. Erhalten Sie jetzt Klarheit.',
        twitterTitle: 'Unbiased: Entschlüsseln Sie die Nachrichten. Sofort.',
        twitterDescription: 'Versteckte Agenden? Unbias nutzt KI, um Voreingenommenheit, Faktenbehauptungen und wahre Perspektive in jedem Artikel aufzudecken. Ihr Werkzeug für sofortige Nachrichtenklarheit.',
    },
    // Claims Display
    ClaimsDisplay: {
        title: 'Faktische Behauptungen',
        noClaims: 'In diesem Artikel wurden keine faktischen Behauptungen identifiziert.',
        source: 'Quelle:',
        significance: 'Bedeutung:',
        context: 'Kontext:',
    },
    // BiasScoreMeter
    BiasScoreMeter: {
        title: 'Bias-Analyse',
        low: 'Niedrig',
        moderate: 'Moderat',
        high: 'Hoch',
        unknown: 'Unbekannt',
        confidence: 'Konfidenz',
        summary: 'Zusammenfassung',
        slantRationale: 'Begründung',
    },
    // Confidence Levels
    ConfidenceLevel: {
        'Low': 'Niedrige',
        'Medium': 'Mittlere',
        'High': 'Hohe',
        'Unknown': 'Unbekannt',
    },
    // UnifiedDimensionAnalysis
    UnifiedDimensionAnalysis: {
        noDimensionData: 'Keine Dimensionsdaten verfügbar',
        noFindings: 'Keine spezifischen Ergebnisse für diese Dimension.',
        observation: 'Beobachtung',
        explanation: 'Erklärung',
        evidence: 'Nachweis',
        source: 'Quelle:',
        impact: 'Auswirkung',
        omission: 'N/A - Auslassung',
        balanced: 'Ausgewogen',
        caution: 'Vorsicht',
        biased: 'Voreingenommen',
        unknown: 'Unbekannt',
        // Dimension names
        sourceSelection: 'Quellenauswahl',
        fairnessBalance: 'Gleichgewicht',
        framingEmphasis: 'Rahmensetzung',
        wordChoiceTone: 'Wortwahl',
        headlineTitleBias: 'Schlagzeile',
    },
    // Add SharedAnalysis namespace
    SharedAnalysis: {
        sharedAnalysisTitle: 'Geteilte Analyseergebnisse',
        loadingSharedAnalysis: 'Lade geteilte Analyse...',
        analyzeUrlTitle: 'Weitere URL analysieren',
        error: 'Fehler beim Laden der geteilten Analyse',
        analysisNotFound: 'Analyse nicht gefunden',
        analysisNotFoundDetails: 'Die Analyse konnte nicht abgerufen werden. Sie wurde möglicherweise entfernt oder der Link ist falsch.',
        analysisFailed: 'Analyse fehlgeschlagen',
        analysisFailedDetails: 'Diese Analyse konnte nicht abgeschlossen werden.',
        tryNewAnalysis: 'Starten Sie eine neue Analyse mit dem Formular oben.',
        analyzeYourOwn: 'Möchten Sie Ihren eigenen Artikel analysieren?',
        tryItYourself: 'Selbst ausprobieren'
    },
};

export default messages; 