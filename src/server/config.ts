/**
 * Server configuration. Values are read lazily so `next build` works without secrets;
 * each consumer reports a clear error when a value it needs is missing.
 */
const config = {
  get supabase() {
    return {
      url: process.env.SUPABASE_URL || '',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    };
  },
  get firecrawl() {
    return { apiKey: process.env.FIRECRAWL_API_KEY || '' };
  },
  get ai() {
    return {
      // OpenAI by default; any OpenAI-compatible API (OpenRouter, Gemini, Anthropic, Ollama, ...) via OPENAI_BASE_URL
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || '',
      model: process.env.LLM_MODEL_NAME || 'gpt-6.1-sol',
    };
  },
  get turnstileSecretKey() {
    return process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '';
  },
};

export default config;

/**
 * Paywalled publications: their articles are only read from archive.today snapshots.
 */
export const paywalledDomains = [
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
