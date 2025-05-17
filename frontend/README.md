# Frontend Application for Unbias

This is the frontend Next.js application for the Unbias article analysis tool. It provides the user interface for submitting articles, viewing analysis progress in real-time, displaying detailed results, and **sharing completed analyses**.

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

This will start the development server, typically on [http://localhost:3000](http://localhost:3000). Open this URL in your browser to see the application.

The main page is `src/app/[locale]/page.tsx`. The page auto-updates as you edit the file.
A new page for shared analyses can be found at `src/app/[locale]/analysis/[jobId]/page.tsx`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a font family optimized for Vercel.

## Project Structure

```
frontend/
├── src/                      # Source code
│   ├── app/                  # Next.js App Router (pages, layout, global styles)
│   │   ├── [locale]/         # Locale-specific routes (en, de)
│   │   │   ├── analysis/     # New: Routes related to specific analyses
│   │   │   │   └── [jobId]/
│   │   │   │       └── page.tsx # New: Page for displaying a shared analysis
│   │   │   ├── page.tsx      # Main page component for the application
│   │   │   └── layout.tsx    # Locale-specific layout component
│   │   ├── page.tsx          # Root redirect page
│   │   ├── layout.tsx        # Root layout component
│   │   └── globals.css       # Global CSS and Tailwind directives
│   ├── components/           # React components
│   │   ├── ui/               # Shadcn/ui components (Button, Card, Accordion, Toast, etc.)
│   │   ├── blocks/           # Larger reusable UI blocks (e.g., HeroSection)
│   │   ├── pages/            # Page-specific client components (e.g., HomeClient, SharedAnalysisClient)
│   │   ├── AnalysisCard.tsx  # Displays full analysis results
│   │   ├── ArticlePreview.tsx# Displays article metadata preview
│   │   ├── BiasReportDisplay.tsx # Shows detailed bias dimensions
│   │   ├── BiasScoreMeter.tsx# Visualizes overall bias score
│   │   ├── ClaimsDisplay.tsx # Lists factual claims in an accordion
│   │   ├── Header.tsx        # Application header with language switcher
│   │   ├── LanguageSwitcher.tsx # Component for switching between languages
│   │   ├── RecentAnalysesList.tsx # Displays history of analyses
│   │   ├── ShareableLink.tsx # New: Component for displaying and copying shareable link
│   │   ├── SkeletonLoader.tsx# Loading placeholders
│   │   ├── ThemeToggle.tsx   # Dark/Light mode switcher
│   │   ├── UnifiedDimensionAnalysis.tsx # Consolidates dimension display
│   │   └── UrlInput.tsx      # Main URL input form component
│   ├── i18n/                 # Internationalization configuration
│   │   └── routing.ts        # Defines supported locales and routing config
│   ├── messages/             # Translation message files
│   │   ├── en.ts             # English translations (updated for new features)
│   │   └── de.ts             # German translations (updated for new features)
│   ├── lib/                  # Core frontend libraries and utilities
│   │   ├── ThemeProvider.tsx # Next-themes setup
│   │   ├── apiClient.ts      # Axios client for backend API communication (updated for reuse logic)
│   │   ├── config.ts         # Frontend configuration (e.g., USE_MOCK_API)
│   │   ├── localStorageUtils.ts # Utilities for localStorage interactions
│   │   ├── mockApiService.ts # Mock API for frontend-only development
│   │   ├── socketClient.ts   # Socket.IO client for real-time updates
│   │   ├── store.ts          # Zustand store for global state management (updated for reuse/sharing)
│   │   └── utils.ts          # General utilities (e.g., cn for classnames)
│   ├── types/                # TypeScript type definitions
│   │   ├── analysis.ts       # Types related to analysis data
│   │   └── vitest.d.ts       # Vitest specific type extensions
│   ├── utils/                # Specific utility modules
│   │   ├── biasInterpreter.ts# Logic to interpret raw bias data
│   │   └── logger.ts         # Frontend logging utility
│   ├── __tests__/            # Vitest tests
│   │   ├── components/       # Component tests
│   │   ├── lib/              # Library/utility tests
│   │   ├── pages/            # Page-level tests (incl. shared analysis page)
│   │   └── utils/            # Utility module tests
│   └── setupTests.ts         # Vitest global setup file
├── public/                   # Static files (images, fonts, etc.)
├── .env.local.example        # Example environment variables
├── components.json           # Shadcn/ui configuration
├── eslint.config.mjs         # ESLint flat configuration file
├── i18n.ts                   # Root internationalization configuration
├── middleware.ts             # Next.js middleware for i18n routing
├── LINTING.md                # Guide to linting and code quality
├── next.config.mjs           # Next.js configuration
├── package.json              # Project dependencies and scripts
├── postcss.config.mjs        # PostCSS configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── vitest.config.ts          # Vitest configuration
```

## Key Features & Technologies

*   **Next.js 15.3.1 (App Router)**: Modern React framework for building the user interface.
*   **TypeScript 5.x**: For static typing and improved code quality.
*   **Tailwind CSS 4.x**: A utility-first CSS framework for styling.
*   **Shadcn/ui**: Re-usable UI components built with Radix UI and Tailwind CSS.
*   **Zustand 5.x**: Lightweight global state management.
*   **Socket.IO Client 4.x**: For real-time communication with the backend to receive job status updates.
*   **Axios 1.x**: For making HTTP requests to the backend API.
*   **next-intl 3.x**: Internationalization library for Next.js, supporting English and German.
*   **Shareable Links**: Users can copy unique URLs to share completed analyses.
*   **Analysis Reuse Handling**: Frontend store handles API responses that may return existing analysis data directly.
*   **Vitest**: For unit and component testing.
*   **ESLint**: For code linting and maintaining code style.
*   **Custom Logging System**: Flexible logging controllable via environment variables and browser console (see `LOGGING.md` in the root and `src/utils/logger.ts`).
*   **Mock API**: Option to run the frontend with mock data for development (`src/lib/mockApiService.ts`, controlled by `USE_MOCK_API` in `src/lib/config.ts`).

## Development Scripts

*   `npm run dev`: Starts the development server.
    *   `npm run dev:debug`: Starts dev server with `debug` log level.
    *   `npm run dev:trace`: Starts dev server with `trace` log level (most verbose).
    *   `npm run dev:quiet`: Starts dev server with `error` log level (least verbose).
*   `npm run build`: Builds the application for production.
*   `npm run start`: Starts the production server.
*   `npm run lint`: Lints the codebase using ESLint.
*   `npm run test`: Runs all Vitest tests once.
*   `npm run test:watch`: Runs Vitest tests in watch mode.
*   `npm run test:coverage`: Runs Vitest tests and generates a coverage report.

## Testing

The project uses **Vitest** for testing. Tests are located in the `src/__tests__` directory, mirroring the structure of the source code. The setup file is `src/setupTests.ts`.

To run tests:

```bash
npm run test           # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

## Linting

ESLint is configured with Next.js recommended rules using a flat configuration file (`eslint.config.mjs`). See `LINTING.md` for common issues and how to fix them.

To lint the code:
```bash
npm run lint
```
To attempt auto-fixing lint issues:
```bash
npm run lint -- --fix
# A custom script `fix-lint-issues.js` is also available for more targeted fixes.
node fix-lint-issues.js [--dry-run]
```

## Internationalization

The application supports English and German languages using next-intl:

- URL paths include language prefixes (`/en`, `/de`), including for shared analysis pages (e.g., `/en/analysis/{jobId}`).
- Default locale is English.
- First-time visitors see the interface in their browser's preferred language if supported.
- Language selection persists between page reloads.
- All UI text is translated according to the selected language.
- The language switcher in the header allows users to change their language preference.
- Current language code is sent to the backend when submitting a URL for analysis.
- For shared analysis pages, the UI is localized based on the URL's locale, while the analysis content itself is displayed in its original language.

Key files:
- `i18n.ts`: Root configuration file for next-intl.
- `middleware.ts`: Handles language detection and routing.
- `src/i18n/routing.ts`: Defines supported locales and routing configuration.
- `src/messages/en.ts` and `src/messages/de.ts`: Translation message files (updated with keys for new features like sharing).

## Logging

The frontend has a flexible logging system detailed in `LOGGING.md` (root directory) and implemented in `src/utils/logger.ts`. Log verbosity can be controlled via:
1.  `NEXT_PUBLIC_LOG_LEVEL` environment variable (e.g., `debug`, `trace`).
2.  Browser's `localStorage`:
    *   `localStorage.setItem('debug_mode', 'true');` (then refresh) to enable max verbosity.
    *   `toggleDebugLogs();` function in the browser console.

## State Management (Zustand)

Global state is managed using **Zustand**. The main store is defined in `src/lib/store.ts`. It handles:
*   Current analysis job ID, status, and results.
*   Article preview data.
*   Error messages and loading states.
*   History of analyzed articles (persisted to `localStorage` via `src/lib/localStorageUtils.ts`).
*   **Logic to handle responses from `/api/submit` that might return an existing analysis directly (for the reuse feature).**
*   **Actions and state for fetching and displaying data for shared analysis pages (`/analysis/[jobId]`).**

## Toast Notifications

The application uses a custom toast notification system (see `src/components/ui/toast-manager.tsx` and `src/components/ui/toast.tsx`) for providing brief user feedback, such as confirming when a shareable link has been copied to the clipboard.

## Environment Variables

Create a `.env.local` file in the `frontend` directory with the following variables:

```env
# URL for the backend API server
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3001

# URL for the backend WebSocket server
NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:3001

# Optional: Set the default frontend log level (error, warn, info, debug, trace)
# Defaults to 'error' in production, 'debug' in development if not set.
# NEXT_PUBLIC_LOG_LEVEL=debug
```

## Build Configuration

As per `next.config.mjs`:
*   ESLint errors **are ignored** during production builds (`eslint.ignoreDuringBuilds: true`).
*   TypeScript errors **are ignored** during production builds (`typescript.ignoreBuildErrors: true`).

This is to allow deployment even if there are non-critical linting or type issues, but these should ideally be resolved.