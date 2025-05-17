# Unbiased: Article Analysis Tool PRD

## Status: Draft (Version 1.3 - Incorporating Dimension Status, Archive.is, Language Features)

## Intro

This document outlines the requirements for Unbiased, a web application designed to provide users with AI-driven analysis of online articles. Users will submit a public article URL, and the application will return an analysis covering factual claims, potential bias (with dimension-specific status indicators), and the article's perspective ("slant"). The system will feature real-time status updates during processing, employ strategies like using Archive.is for reliable content fetching, maintain a history of analyzed articles, and offer multi-language support (EN/DE). This project aims to create a modern, reliable, and user-friendly tool for media literacy.

## Goals and Context

*   **Clear project objectives:**
    *   Develop a functional web application enabling URL submission for AI analysis.
    *   Provide analysis results: Factual Claims Summary, Bias Report (with dimension statuses: Balanced, Caution, Biased, Unknown), Slant Tag.
    *   Implement real-time status updates for user feedback during analysis.
    *   Display a publicly viewable history of successfully analyzed articles.
    *   Build upon a reliable, asynchronous backend architecture using strategic content fetching (including Archive.is for major publications).
    *   Support user interface and analysis results in English and German.
    *   Ensure core functionality is well-tested via unit tests.
*   **Measurable outcomes:**
    *   Users can successfully submit URLs (including major news sites identified in the backend config) and receive complete analysis results without application crashes.
    *   Real-time status updates reflect the actual processing stage accurately.
    *   The history list correctly populates with recently analyzed articles.
    *   Bias dimension statuses (Balanced, Caution, Biased, Unknown) are displayed clearly with appropriate visual cues (color/icon).
    *   Users can switch the UI language between English and German via URL prefixes (/en, /de).
    *   Analysis text content (summaries, rationales) is provided in the selected language.
    *   Analysis typically completes within an acceptable timeframe (e.g., under 2 minutes, dependent on external APIs).
*   **Success criteria:**
    *   All functional requirements (Epics 1-6 below) are implemented and pass functional testing.
    *   All defined non-functional requirements are met.
    *   Unit tests achieve adequate coverage of core logic and pass consistently.
    *   The application deploys and runs successfully on the target infrastructure.
    *   Analysis results, including dimension statuses and localized text, are presented clearly and are useful.
*   **Key performance indicators (KPIs):**
    *   Analysis request completion rate (Success / Total Submitted).
    *   History feature interaction rate (Clicks on history items / Page views).
    *   Average analysis processing time (tracked internally).
    *   Language selection usage rate (based on URL prefixes).

## Features and Requirements

*   **Functional requirements:**
    *   Accept public URL input from users.
    *   Validate submitted URL format.
    *   Accept user language preference (EN/DE, derived from URL) during submission.
    *   Queue analysis requests for asynchronous background processing, storing language preference.
    *   Strategically fetch article content: Use `archive.is/newest/` for predefined major publication domains; use the original URL directly for others.
    *   Utilize an AI model (via API) to generate: Factual Claims Summary, Bias Report (including dimension summaries and status labels: 'Balanced', 'Caution', 'Biased', 'Unknown'), Slant Tag. AI-generated text content (summaries, rationales) should be in the requested language (EN/DE). Backend stores/returns status labels and slant categories in English.
    *   Provide real-time status updates to the user interface (Queued, Fetching, Analyzing, Complete, Failed) via WebSockets.
    *   Store the status, language, results (including dimension statuses), and errors of each analysis job persistently in a PostgreSQL database (Supabase).
    *   Display the final analysis results to the user upon successful completion, translating stored English labels (dimension names, slant categories, status words) according to the current UI locale.
    *   Display user-friendly error messages (in English) if analysis fails.
    *   Display a list of recently completed analyses (including URL/Headline and translated Slant category).
    *   Allow users to view the full results of a previously completed analysis by selecting it from the history list (results text shown in original analysis language, labels translated to current UI language).
    *   Allow users to switch the frontend UI language between English and German via a language switcher (modifying URL prefix).
*   **Non-functional requirements:**
    *   **Reliability:** System must handle concurrent requests. Background jobs persistent via BullMQ/Redis. Durable results storage (Postgres). Graceful handling of fetch failures (direct or Archive.is).
    *   **Performance:** Immediate submission feedback (<500ms). Prompt status updates via WebSockets. Reasonable analysis time. Fast history loading. Efficient loading of i18n translation files, minimizing impact on initial page load and navigation.
    *   **Usability:** Clean, intuitive interface. Understandable status/error messages. Clear visual indicators (color-coded badges/icons) for dimension status. Seamless language switching, with initial language detection based on browser preference where feasible. Tooltip for "Unknown" dimension status.
    *   **Maintainability:** Standard practices (TypeScript, ESLint, Prettier), well-structured code, commenting, testable. Clear separation of concerns (Frontend, API Server, Worker). Configurable domain list for Archive.is strategy.
    *   **Testability:** Core backend (API handlers, worker steps, helpers) and frontend logic (state management via Zustand, components via RTL) covered by unit tests (Vitest). Unit tests for i18n: Key components should be tested to ensure they correctly render translated text when the locale is switched (mocking the i18n provider and messages). Manual QA pass for verifying overall translation consistency and correctness in both English and German across all UI elements before release.
    *   **Security:** No user auth/PII. Secure API key management via environment variables. CORS policy implemented.
    *   **Localization:** UI text externalized for EN/DE (`next-intl`). AI prompts adaptable for response language. Consistent English keys/labels in backend data structure.
    *   **Robustness:** System gracefully handles failures during content fetching (direct or Archive.is) and AI analysis. Handles potential LLM failure to provide dimension status (defaults to "Unknown"). Handles potential LLM failure to provide analysis text in requested language (presents results in whatever language is returned). Graceful fallback to the default language (English) for any UI elements with missing translations in the selected locale. Errors related to missing translations should be logged for development attention.
*   **User experience requirements:**
    *   Clean SPA feel. Clear visual sections (Input, Article Preview, Analysis, History). Obvious processing feedback (spinners, status text). Readable results. Translated UI elements (including dimension/slant/status labels) based on locale.
*   **Integration requirements:**
    *   Integrate with Diffbot API for content extraction.
    *   Integrate with OpenAI API for AI analysis.
    *   Frontend <-> Backend (HTTP via Axios, WebSockets via Socket.IO client).
    *   Backend <-> Queue (Redis/BullMQ/ioredis).
    *   Backend <-> DB (Postgres/Supabase client).
*   **Testing requirements:**
    *   **Unit Tests:** Mandatory for core functionality (API handlers, worker logic, helpers, frontend components, state management). Mock external dependencies. Test language handling, Archive.is logic paths, dimension status rendering. Framework: Vitest. Frontend Library: React Testing Library.

## Epic Story List (Updated with Subtasks)

{ Testing is integrated into the completion criteria of each story/subtask. }

### Epic 0: Initial Setup & Configuration
*(Subtasks as previously defined in PRD v1.1, ensure DB schema step includes `language` column)*

### Epic 1: Backend - Core Analysis Flow & API
*(Subtasks as previously defined in PRD v1.1, noting that DB/Queue interactions will later incorporate language)*

### Epic 2: Frontend - User Interaction & Display
*(Subtasks as previously defined in PRD v1.1, noting that components will later incorporate i18n and state management uses Zustand)*

### Epic 3: History Feature
*(Subtasks as previously defined in PRD v1.1, noting that display will later incorporate i18n for labels)*

---
***New Epics Below***

### Epic 4: Enhanced Bias Dimension Feedback (Revised)

*   **Goal:** Provide a clear, single-word, backend-generated status (Balanced, Caution, Biased, Unknown) for each bias dimension analyzed, improving clarity and consistency.
*   **Rationale:** Moves interpretation logic to the backend, simplifies the frontend, and provides clearer, more direct feedback inspired by the current UI but generated by the AI.

    #### Story 4.1: Backend - Generate Dimension Status
    *   **As a** System Architect, **I want** the OpenAI analysis prompt modified to explicitly request a single-word status label ("Balanced", "Caution", "Biased", or "Unknown") for each bias dimension summary, **so that** the backend receives structured, easily interpretable feedback directly from the AI.
    *   **Subtask 4.1.1:** Update the OpenAI prompt in `backend/src/lib/openaiClient.ts` precisely as specified in the refined requirements (defining status words 'Balanced', 'Caution', 'Biased', 'Unknown'; updating JSON example for `dimension_summaries` to include `{ summary, status }`; adding specific instructions for providing the status).
    *   **Subtask 4.1.2:** Update backend TypeScript types (`backend/src/types/index.ts`) for `dimension_summaries` to `{ summary: string; status: string; }`.
    *   **Subtask 4.1.3:** Modify `performAnalysisWithOpenAI` to default the `status` to `"Unknown"` if the LLM provides an invalid/missing status for a dimension after parsing the JSON.
    *   **Subtask 4.1.4:** Verify `jobsRepository.updateJobAsComplete` saves the updated structure correctly.
    *   **Subtask 4.1.5:** Update unit tests for `openaiClient.ts` (parsing, default status) and `jobsRepository.ts` (saving new structure).
    *   **Acceptance Criteria:**
        *   OpenAI prompt requests a single-word status ('Balanced', 'Caution', 'Biased', 'Unknown').
        *   Backend defaults to "Unknown" if AI fails to provide a valid status.
        *   Status labels are stored correctly in the DB (as English strings within the JSON).
        *   Unit tests pass.

    #### Story 4.2: Frontend - Display Dimension Status
    *   **As a** User, **I want** to see a clear visual badge (Green for Balanced, Yellow for Caution, Red for Biased, Gray for Unknown) with the corresponding single-word status label next to each bias dimension name, **so that** I can quickly understand the assessment.
    *   **Subtask 4.2.1:** Update frontend TypeScript types (`frontend/src/types/analysis.ts`) for `dimension_summaries`.
    *   **Subtask 4.2.2:** Remove any frontend dimension status calculation logic (likely from `frontend/src/utils/biasInterpreter.ts`).
    *   **Subtask 4.2.3:** Update the `DimensionStatusIcons` component (`frontend/src/components/DimensionStatusIcons.tsx`):
        *   Receive `dimensionSummaries` object `{ summary, status }`.
        *   Map the backend `status` string ('Balanced', 'Caution', 'Biased', 'Unknown') to badge color (Green, Yellow, Red, Gray) and icon (`CheckCircle`, `AlertCircle`, `AlertTriangle`, `HelpCircle`).
        *   Display the *translated* status word (using `next-intl`'s `t()` function) inside the badge.
        *   Add an info `Tooltip` next to the "Unknown" badge explaining: "AI could not determine the status for this dimension." (Tooltip text requires translation key).
    *   **Subtask 4.2.4:** Ensure `UnifiedDimensionAnalysis` displays the `summary` correctly.
    *   **Subtask 4.2.5:** Verify `AnalysisCard` passes the updated `analysisData` structure.
    *   **Subtask 4.2.6:** Update unit tests for `DimensionStatusIcons` verifying correct badge color, icon, translated text, and tooltip rendering based on the status string and locale.
    *   **Acceptance Criteria:**
        *   Frontend type definitions match `{ summary, status }`.
        *   Frontend reads status directly from backend data.
        *   `DimensionStatusIcons` displays badges with color/icon mapped from status and translated status word.
        *   An explanatory tooltip appears for the "Unknown" status badge.
        *   Unit tests pass.

### Epic 5: Paywall Handling with Archive.is (Simplified Proactive Strategy)

*   **Goal:** Reliably analyze articles from major publications known to have paywalls by proactively using Archive.is for those sites.
*   **Rationale:** Using Archive.is for known problematic domains increases the success rate without adding complexity for other URLs.

    #### Story 5.1: Implement Proactive Archive.is Fetch Strategy
    *   **As a** System, **I want** the analysis worker to check if a submitted URL belongs to a predefined list of major publications; if yes, fetch content via `archive.is/newest/ORIGINAL_URL` using Diffbot; otherwise, fetch the `ORIGINAL_URL` directly using Diffbot, **so that** analysis is more robust for known paywalled sites while standard fetching is used for others.
    *   **Subtask 5.1.1:** Maintain a configuration list of domains designated for proactive Archive.is fetching (e.g., in `backend/src/config/index.ts`: `proactiveArchiveDomains = ['spiegel.de', 'nytimes.com', ...]`).
    *   **Subtask 5.1.2:** Modify the content extraction step in `analysisWorker.ts`:
        *   Extract the domain from the `originalUrl`.
        *   Check if the domain is in the `proactiveArchiveDomains` list.
        *   **If YES:**
            *   Construct `fetchUrl = \`http://archive.is/newest/\${encodeURIComponent(originalUrl)}\`;`
            *   Log: `console.log(\`Domain is on proactive list. Fetching job ${jobId} via Archive.is: ${fetchUrl}\`);`
        *   **If NO:**
            *   Set `fetchUrl = originalUrl;`
            *   Log: `console.log(\`Fetching job ${jobId} directly from original URL: ${fetchUrl}\`);`
        *   Call `fetchContentFromDiffbot(fetchUrl)` using the determined URL.
        *   If `fetchContentFromDiffbot` fails (after retries), handle the failure (throw `JobProcessingError`, leading to 'Failed' status). The error message should indicate which URL (`originalUrl` or the archive one) was attempted.
        *   If it succeeds, proceed with the analysis using the extracted content.
    *   **Subtask 5.1.3:** Update unit tests for `analysisWorker.ts`:
        *   Scenario: URL domain is on the list -> Archive.is URL used (success/failure).
        *   Scenario: URL domain is NOT on list -> Original URL used (success/failure).
    *   **Acceptance Criteria:**
        *   A configurable list of domains triggers proactive Archive.is fetching.
        *   If the domain is on the list, `archive.is/newest/` is used for the Diffbot fetch URL.
        *   If the domain is NOT on the list, the original URL is used for the Diffbot fetch URL.
        *   There is no fallback mechanism; the chosen fetch strategy either succeeds or fails (after Diffbot's internal retries).
        *   Analysis proceeds if the chosen fetch strategy succeeds.
        *   Job fails if the chosen fetch strategy fails.
        *   The process remains transparent to the user.
        *   Unit tests for both logic paths pass.

### Epic 6: Multi-Language Support (EN/DE) (Revised)

*   **Goal:** Allow users to select EN/DE for UI and receive AI analysis text in that language, while keeping data labels consistent.
*   **Rationale:** Improves usability for German speakers.

    #### Story 6.1: Frontend - Language Selection & i18n
    *   **As a** User, **I want** to select English or German for the website interface *and* have UI labels (like dimension names, slant categories, status words) translated accordingly, **so that** I can fully use the tool in my preferred language.
    *   **Subtask 6.1.1:** Integrate `next-intl`.
    *   **Subtask 6.1.2:** Create `messages/en.json`, `messages/de.json`. Add keys for: Static UI text, Bias Dimension Names, Slant Category Names, Dimension Status Labels ('Balanced', 'Caution', 'Biased', 'Unknown'), and the "Unknown" status tooltip text.
    *   **Subtask 6.1.3:** Replace hardcoded text/labels in components with `t('key')`.
    *   **Subtask 6.1.4:** Implement language switcher in `Header`.
    *   **Subtask 6.1.5:** Configure `next-intl` for URL path prefixes (`/en`, `/de`), defaulting to English.
    *   **Subtask 6.1.6:** Update `submitUrl` action (in `frontend/src/lib/store.ts`) to send current locale ('en'/'de') to backend.
    *   **Subtask 6.1.7:** Update unit tests for i18n rendering.
    *   **Acceptance Criteria:**
        *   `next-intl` manages locales via URL (`/en`, `/de`), defaults to English.
        *   UI text, dimension names, slant categories, status words translated based on locale.
        *   Language switcher works.
        *   Locale code sent to backend.
        *   UI renders correctly.

    #### Story 6.2: Backend - Language Aware Processing
    *   **As a** System, **I want** the backend to process analysis requests according to the language specified ('en' or 'de'), providing AI-generated *text* (summaries, rationales) in that language, while keeping JSON keys and stored *labels* (like slant category names, dimension status words) in English, **so that** users receive localized analysis content within a consistent data structure.
    *   **Subtask 6.2.1:** Modify `POST /api/submit` to accept `{ url: "...", language: "en" | "de" }`, default 'en'.
    *   **Subtask 6.2.2:** Add `language VARCHAR(2) NOT NULL DEFAULT 'en'` column to `jobs`. **DB Migration Required.**
    *   **Subtask 6.2.3:** Update `jobsRepository.createJob` to store `language`.
    *   **Subtask 6.2.4:** Update `AnalysisJobData` and `addAnalysisJob` to include/pass `language`.
    *   **Subtask 6.2.5:** Worker retrieves `language`.
    *   **Subtask 6.2.6:** Pass `language` to `performAnalysisWithOpenAI`.
    *   **Subtask 6.2.7:** Update `