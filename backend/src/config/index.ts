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
 * Organized by country/region for easier maintenance
 */
export const proactiveArchiveDomains = [
  // === United States (US) ===
  'nytimes.com', // The New York Times
  'washingtonpost.com', // The Washington Post
  'bloomberg.com', // Bloomberg
  'latimes.com', // Los Angeles Times
  'usatoday.com', // USA Today
  'chicagotribune.com', // Chicago Tribune
  'newyorker.com', // The New Yorker
  'theatlantic.com', // The Atlantic
  'wired.com', // Wired
  'forbes.com', // Forbes
  'businessinsider.com', // Business Insider
  'npr.org', // National Public Radio
  'foreignpolicy.com', // Foreign Policy
  'harpers.org', // Harper's Magazine
  'vanityfair.com', // Vanity Fair
  'technologyreview.com', // MIT Technology Review
  // 'cnn.com', // CNN - Generally free
  // 'foxnews.com', // Fox News - Generally free

  // === United Kingdom (UK) ===
  'ft.com', // Financial Times
  'economist.com', // The Economist
  'telegraph.co.uk', // The Telegraph
  'thetimes.co.uk', // The Times & The Sunday Times
  'bbc.com', // BBC News
  'independent.co.uk', // The Independent
  'dailymail.co.uk', // Daily Mail
  'standard.co.uk', // Evening Standard

  // === Germany (DE) ===
  'spiegel.de', // Der Spiegel
  'zeit.de', // Die Zeit
  'faz.net', // Frankfurter Allgemeine Zeitung
  'sueddeutsche.de', // Süddeutsche Zeitung
  'tagesspiegel.de', // Der Tagesspiegel
  'handelsblatt.com', // Handelsblatt
  'taz.de', // taz
  'bild.de', // Bild

  // === France (FR) ===
  'lemonde.fr', // Le Monde
  'lefigaro.fr', // Le Figaro
  'liberation.fr', // Libération
  'lesechos.fr', // Les Echos
  'mediapart.fr', // Mediapart

  // === Italy (IT) ===
  'corriere.it', // Corriere della Sera
  'repubblica.it', // La Repubblica
  'lastampa.it', // La Stampa
  'ilsole24ore.com', // Il Sole 24 Ore
  // 'ansa.it', // ANSA - Generally free

  // === Spain (ES) ===
  'elpais.com', // El País
  'elmundo.es', // El Mundo
  'abc.es', // ABC
  'lavanguardia.com', // La Vanguardia
  'expansion.com', // Expansión

  // === International & Other ===
  'apnews.com', // Associated Press
  'aljazeera.com', // Al Jazeera

  // === Academic & Scientific ===
  'science.org', // Science Magazine (AAAS)
  'nature.com', // Nature Journal
  'cell.com', // Cell Press Journals
  'thelancet.com', // The Lancet Journals

  // 'medium.com', // Platform with variable quality and user-dependent paywalls
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
