/**
 * LangSearch Web Search Integration
 * @param {string} query - The user's search query
 * @param {string} apiKey - Your LangSearch API Key
 * @param {string} freshness - Optional: 'oneDay', 'oneWeek', 'oneMonth'
 */
export async function langSearch(query, apiKey, freshness = 'oneMonth') {
  const endpoint = 'https://api.langsearch.com/v1/web-search';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        freshness: freshness,
        // Optional: you can also pass 'count' for number of results (default is 10)
        count: 10
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`LangSearch Error: ${errorData.message || response.statusText}`);
    }
    const data = await response.json();
    
    // data.data typically contains the search results array
    return data.data; 
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
}
