// Mock all required environment variables for tests
process.env.SUPABASE_URL = 'https://test-supabase-url.com';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DIFFBOT_API_TOKEN = 'test-diffbot-token';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.PROACTIVE_ARCHIVE_DOMAINS = 'example.com,test.com';
process.env.IMAGE_PROXY_SECRET = 'test-image-proxy-secret';
process.env.NODE_ENV = 'test';

// This ensures environment variables are set before any tests run
// Add other global test setup code here as needed 