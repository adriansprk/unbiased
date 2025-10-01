/* eslint-disable no-console */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fetchContentFromFirecrawl } from '../lib/firecrawlClient';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testFirecrawlIntegration() {
  // Test URLs - test archive.ph and archive.is URLs to verify all archive services work
  const testUrls = [
    'https://archive.ph/wCqPF', // Test archive.ph URL
    'https://archive.is/BSLWh', // Archive.is URL provided by user
    'https://firecrawl.dev', // Test with a regular URL to ensure both paths work
  ];

  console.log('🧪 Testing Firecrawl integration...\n');

  // Create output directory for saved content
  const outputDir = path.resolve(process.cwd(), 'extracted-content-samples');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }

  // Check if Firecrawl API key is configured
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error('❌ FIRECRAWL_API_KEY is not configured in environment variables');
    console.log('Please set FIRECRAWL_API_KEY in your .env file to test the integration');
    process.exit(1);
  }

  console.log('✅ Firecrawl API key is configured');

  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    try {
      console.log(`\n📄 Testing URL ${i + 1}/${testUrls.length}: ${url}`);
      console.log('⏳ Fetching content...');

      const result = await fetchContentFromFirecrawl(url);

      console.log('✅ Success! Content extracted:');
      console.log(`   📝 Title: ${result.title || 'No title'}`);
      console.log(`   📄 Text length: ${result.text?.length || 0} characters`);
      console.log(`   🏷️  HTML length: ${result.html?.length || 0} characters`);
      console.log(`   🌐 Site name: ${result.siteName || 'No site name'}`);
      console.log(`   🔗 URL: ${result.url || 'No URL'}`);
      console.log(`   📡 Fetch strategy: ${result.fetchStrategy}`);
      console.log(`   📦 Is archive content: ${result.isArchiveContent}`);

      if (result.text) {
        console.log(`   📖 Text preview: ${result.text.substring(0, 200)}...`);
      }

      // Save extracted content to file
      const urlHost = new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${urlHost}_${timestamp}.json`;
      const filepath = path.join(outputDir, filename);

      const contentToSave = {
        url: url,
        extractedAt: new Date().toISOString(),
        title: result.title,
        subtitle: result.siteName, // Using siteName as subtitle fallback
        text: result.text,
        html: result.html,
        fetchStrategy: result.fetchStrategy,
        isArchiveContent: result.isArchiveContent,
        metadata: {
          author: result.author,
          date: result.date,
          language: result.language,
          canonicalUrl: result.canonicalUrl,
          tags: result.tags
        }
      };

      fs.writeFileSync(filepath, JSON.stringify(contentToSave, null, 2), 'utf8');
      console.log(`   💾 Content saved to: ${filepath}`);

    } catch (error) {
      console.error(`❌ Error fetching ${url}:`);
      console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n🏁 Test completed!');
  console.log(`📂 All extracted content saved in: ${outputDir}`);
}

// Run the test
testFirecrawlIntegration().catch((error) => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});