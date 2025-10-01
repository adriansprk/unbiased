import dotenv from 'dotenv';
import path from 'path';
import { validateVar, validateBooleanVar } from './envValidator';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Required environment variables are now validated in entry points (server.ts and analysisWorker.ts)
// through the validateEnv() function, not here.

/**
 * List of domains that should be fetched via Archive.is
 * These are typically major publications with paywalls
 */
export const proactiveArchiveDomains = [
  // === Existing Entries (Reviewed and Kept) ===
  'nytimes.com', // The New York Times (US)
  'wsj.com', // The Wall Street Journal (US)
  'washingtonpost.com', // The Washington Post (US)
  'ft.com', // Financial Times (UK)
  'bloomberg.com', // Bloomberg (US) - Often has article limits
  'economist.com', // The Economist (UK)
  'spiegel.de', // Der Spiegel (Germany)
  'zeit.de', // Die Zeit (Germany)
  'faz.net', // Frankfurter Allgemeine Zeitung (Germany)
  'telegraph.co.uk', // The Telegraph (UK)
  'thetimes.co.uk', // The Times & The Sunday Times (UK)
  'bbc.com', // BBC News (UK) - Primarily for news.bbc.co.uk or bbc.com/news
  'newyorker.com', // The New Yorker (US) - Often has article limits
  'wired.com', // Wired (US) - Often has article limits
  'theatlantic.com', // The Atlantic (US) - Often has article limits
  'forbes.com', // Forbes (US) - Can have interstitial ads/article limits
  'businessinsider.com', // Business Insider (US/Global)
  // 'medium.com',           // Keeping Medium commented out as it's a platform, quality varies wildly, and paywall is user-dependent.
  'latimes.com', // Los Angeles Times (US)
  'theguardian.com', // The Guardian (UK) - Generally free, but good to include for consistency if others are.

  // === Additions for Germany (DE) ===
  'sueddeutsche.de', // Süddeutsche Zeitung
  'welt.de', // Die Welt
  'tagesspiegel.de', // Der Tagesspiegel (Berlin)
  'handelsblatt.com', // Handelsblatt (Business)
  'focus.de', // Focus Online - Often more of a portal, might be less critical for proactive archive.
  'managermagazin.de', // Manager Magazin

  // === Additions for United States (US) ===
  'usatoday.com', // USA Today
  'npr.org', // National Public Radio (News section)
  'chicagotribune.com', // Chicago Tribune
  // 'cnn.com',              // CNN - Generally free, but sometimes has premium content.
  // 'foxnews.com',          // Fox News - Generally free.

  // === Additions for United Kingdom (UK) ===
  'independent.co.uk', // The Independent
  'dailymail.co.uk', // Daily Mail - Generally free, but very high traffic.
  'standard.co.uk', // Evening Standard
  'theguardian.com', // The Guardian

  // === Additions for France (FR) ===
  'lemonde.fr', // Le Monde
  'lefigaro.fr', // Le Figaro
  'liberation.fr', // Libération
  'lesechos.fr', // Les Echos (Business)
  'mediapart.fr', // Mediapart (Investigative, Subscription)

  // === Additions for Italy (IT) ===
  'corriere.it', // Corriere della Sera
  'repubblica.it', // La Repubblica
  'lastampa.it', // La Stampa
  'ilsole24ore.com', // Il Sole 24 Ore (Business)
  // 'ansa.it',              // ANSA (News Agency) - Generally free.

  // === Additions for Spain (ES) ===
  'elpais.com', // El País
  'elmundo.es', // El Mundo
  'abc.es', // ABC
  'lavanguardia.com', // La Vanguardia
  'expansion.com', // Expansión (Business)

  // === Other Notable International Publications ===
  'reuters.com', // Reuters (Global News Agency)
  'apnews.com', // Associated Press (Global News Agency)
  'aljazeera.com', // Al Jazeera (Global)
  'foreignpolicy.com', // Foreign Policy (US)
  'harpers.org', // Harper's Magazine (US)
  'vanityfair.com', // Vanity Fair (US) - Lifestyle but sometimes in-depth articles
  'technologyreview.com', // MIT Technology Review
  'science.org', // Science Magazine (AAAS) - For scientific articles
  'nature.com', // Nature Journal - For scientific articles
  'cell.com', // Cell Press Journals - For scientific articles
  'thelancet.com', // The Lancet Journals - For medical articles
];

// Configuration object
const config = {
  api: {
    port: parseInt(process.env.PORT || '3001', 10),
    socketPort: parseInt(process.env.SOCKET_PORT || process.env.PORT || '3001', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    backendUrl:
      process.env.BACKEND_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://api-unbiased.adriancares.com'
        : `http://localhost:${process.env.PORT || '3001'}`),
  },
  supabase: {
    url: validateVar('SUPABASE_URL'),
    serviceKey: validateVar('SUPABASE_SERVICE_ROLE_KEY'),
  },
  redis: {
    url: validateVar('REDIS_URL'),
  },
  ai: {
    // Gemini configuration (primary)
    geminiApiKey: validateVar('GEMINI_API_KEY'),
    geminiModelName: process.env.GEMINI_MODEL_NAME || 'gemini-1.5-pro-preview-0514',
    // OpenAI configuration (fallback)
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    modelName: process.env.LLM_MODEL_NAME || 'gpt-4o',
    // Which LLM provider to use for analysis
    analysisLlmProvider: process.env.ANALYSIS_LLM_PROVIDER || 'gemini', // 'gemini' or 'openai', default to gemini
  },
  diffbot: {
    apiKey: validateVar('DIFFBOT_API_KEY'),
    apiUrl: 'https://api.diffbot.com/v3',
  },
  firecrawl: {
    apiKey: process.env.FIRECRAWL_API_KEY || '',
  },
  environment: process.env.NODE_ENV || 'development',
  features: {
    reuseExistingAnalysis: validateBooleanVar('REUSE_EXISTING_ANALYSIS', false),
  },
};

export default config;
