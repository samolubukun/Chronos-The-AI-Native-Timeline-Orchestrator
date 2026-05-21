/**
 * Firecrawl Web Scraper Integration
 * @param {string} url - The URL to scrape
 * @param {string} apiKey - Your Firecrawl API Key
 */
export async function firecrawlScrape(url, apiKey) {
  const endpoint = 'https://api.firecrawl.dev/v1/scrape';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown'],
        // Firecrawl can extract specific schemas, which is perfect for spreadsheets
        onlyMainContent: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Firecrawl Error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data; // Contains markdown, metadata, and potentially structured json
  } catch (error) {
    console.error('Firecrawl scrape failed:', error);
    throw error;
  }
}

/**
 * Firecrawl Crawl (Multi-page)
 * @param {string} url - The base URL to crawl
 * @param {string} apiKey - Your Firecrawl API Key
 */
export async function firecrawlCrawl(url, apiKey) {
  const endpoint = 'https://api.firecrawl.dev/v1/crawl';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        limit: 10, // Limit to 10 pages for speed/safety
        scrapeOptions: {
            formats: ['markdown']
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Firecrawl Crawl Error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return data.id; // Returns a crawl ID to poll
  } catch (error) {
    console.error('Firecrawl crawl failed:', error);
    throw error;
  }
}
