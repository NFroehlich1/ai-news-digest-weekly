
import { RssItem, RssSource } from '../types/newsTypes';
import { toast } from "sonner";

/**
 * Service for fetching and parsing RSS feeds - Enhanced for maximum article collection
 */
class RssFeedService {
  private corsProxies: string[] = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/get?url=",
    "https://api.codetabs.com/v1/proxy?quest=",
    "https://thingproxy.freeboard.io/fetch/"
  ];
  
  private currentProxyIndex: number = 0;
  private maxRetries: number = 3;
  
  constructor() {}
  
  private getCurrentProxy(): string {
    return this.corsProxies[this.currentProxyIndex];
  }
  
  private switchToNextProxy(): string {
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
    console.log(`Switching to proxy: ${this.getCurrentProxy()}`);
    return this.getCurrentProxy();
  }
  
  // Massively enhanced The Decoder feed collection
  private async fetchTheDecoderFeed(source: RssSource): Promise<RssItem[]> {
    console.log(`=== MAXIMUM DECODER COLLECTION MODE ===`);
    console.log(`Target: Load 100+ articles from The Decoder`);
    
    try {
      // Comprehensive URL collection for maximum coverage
      const urls = [
        // Main pages - extensive coverage
        "https://the-decoder.de/",
        "https://the-decoder.de/page/2/",
        "https://the-decoder.de/page/3/",
        "https://the-decoder.de/page/4/",
        "https://the-decoder.de/page/5/",
        "https://the-decoder.de/page/6/",
        "https://the-decoder.de/page/7/",
        "https://the-decoder.de/page/8/",
        "https://the-decoder.de/page/9/",
        "https://the-decoder.de/page/10/",
        
        // KI category - the most important for our use case
        "https://the-decoder.de/category/ki/",
        "https://the-decoder.de/category/ki/page/2/",
        "https://the-decoder.de/category/ki/page/3/",
        "https://the-decoder.de/category/ki/page/4/",
        "https://the-decoder.de/category/ki/page/5/",
        "https://the-decoder.de/category/ki/page/6/",
        "https://the-decoder.de/category/ki/page/7/",
        "https://the-decoder.de/category/ki/page/8/",
        
        // Technology category
        "https://the-decoder.de/category/technologie/",
        "https://the-decoder.de/category/technologie/page/2/",
        "https://the-decoder.de/category/technologie/page/3/",
        "https://the-decoder.de/category/technologie/page/4/",
        "https://the-decoder.de/category/technologie/page/5/",
        
        // Research category
        "https://the-decoder.de/category/forschung/",
        "https://the-decoder.de/category/forschung/page/2/",
        "https://the-decoder.de/category/forschung/page/3/",
        "https://the-decoder.de/category/forschung/page/4/",
        
        // Companies category
        "https://the-decoder.de/category/unternehmen/",
        "https://the-decoder.de/category/unternehmen/page/2/",
        "https://the-decoder.de/category/unternehmen/page/3/",
        "https://the-decoder.de/category/unternehmen/page/4/",
        
        // Key company and technology tags
        "https://the-decoder.de/tag/openai/",
        "https://the-decoder.de/tag/openai/page/2/",
        "https://the-decoder.de/tag/chatgpt/",
        "https://the-decoder.de/tag/chatgpt/page/2/",
        "https://the-decoder.de/tag/google/",
        "https://the-decoder.de/tag/microsoft/",
        "https://the-decoder.de/tag/meta/",
        "https://the-decoder.de/tag/anthropic/",
        "https://the-decoder.de/tag/machine-learning/",
        "https://the-decoder.de/tag/deep-learning/",
        "https://the-decoder.de/tag/llm/",
        "https://the-decoder.de/tag/gpt/",
        
        // Monthly archives for comprehensive coverage
        "https://the-decoder.de/2024/12/",
        "https://the-decoder.de/2024/11/"
      ];
      
      const allItems: RssItem[] = [];
      let successCount = 0;
      let failCount = 0;
      
      console.log(`Starting collection from ${urls.length} URLs...`);
      
      // Process in batches for better performance
      const batchSize = 4;
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(urls.length/batchSize)}`);
        
        const batchPromises = batch.map(url => this.fetchSinglePageRobust(url, source));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            allItems.push(...result.value);
            successCount++;
            console.log(`✅ ${batch[index]}: ${result.value.length} articles`);
          } else {
            failCount++;
            console.log(`❌ ${batch[index]}: Failed`);
          }
        });
        
        // Progress update
        console.log(`Progress: ${allItems.length} articles collected so far`);
        
        // Small delay between batches
        if (i + batchSize < urls.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log(`=== COLLECTION RESULTS ===`);
      console.log(`URLs processed: ${urls.length}`);
      console.log(`Successful: ${successCount}, Failed: ${failCount}`);
      console.log(`Raw articles collected: ${allItems.length}`);
      
      // Advanced processing
      const uniqueItems = this.advancedDeduplication(allItems);
      const recentItems = this.filterRecentArticles(uniqueItems, 7); // Last 7 days
      const finalItems = recentItems.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      
      console.log(`After deduplication: ${uniqueItems.length} articles`);
      console.log(`After date filtering: ${recentItems.length} articles`);
      console.log(`=== FINAL RESULT: ${finalItems.length} ARTICLES ===`);
      
      return finalItems.slice(0, 150); // Return up to 150 articles
      
    } catch (error) {
      console.error("Critical error in Decoder collection:", error);
      toast.error("Fehler beim Laden der Artikel");
      return [];
    }
  }
  
  // Robust single page fetching with multiple retry strategies
  private async fetchSinglePageRobust(url: string, source: RssSource): Promise<RssItem[]> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      for (let proxyIndex = 0; proxyIndex < this.corsProxies.length; proxyIndex++) {
        try {
          const proxy = this.corsProxies[proxyIndex];
          const response = await fetch(`${proxy}${url}`, {
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'User-Agent': 'Mozilla/5.0 (compatible; NewsDigestApp/1.0)',
            },
            cache: 'no-store'
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const htmlContent = await response.text();
          
          if (htmlContent.length < 1000) {
            throw new Error("Content too short, likely blocked");
          }
          
          const items = this.parseDecoderHTMLAdvanced(htmlContent, source);
          
          if (items.length > 0) {
            console.log(`🔄 ${url} via ${proxy}: ${items.length} articles`);
            return items;
          }
          
        } catch (error) {
          console.warn(`Attempt ${attempt}, Proxy ${proxyIndex + 1} failed for ${url}:`, error);
        }
      }
      
      // Wait before next attempt
      if (attempt < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    console.error(`❌ All attempts failed for ${url}`);
    return [];
  }
  
  // Advanced HTML parsing with multiple extraction strategies
  private parseDecoderHTMLAdvanced(htmlContent: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];
    
    // Multiple parsing strategies for maximum article extraction
    const strategies = [
      this.parseArticleTags.bind(this),
      this.parseHeadlineLinks.bind(this),
      this.parseContentBlocks.bind(this),
      this.parseListItems.bind(this)
    ];
    
    for (const strategy of strategies) {
      try {
        const strategyItems = strategy(htmlContent, source);
        items.push(...strategyItems);
        
        if (items.length > 100) break; // Stop if we have enough
      } catch (error) {
        console.warn("Parsing strategy failed:", error);
      }
    }
    
    console.log(`Extracted ${items.length} articles from page`);
    return items;
  }
  
  // Strategy 1: Parse article tags
  private parseArticleTags(htmlContent: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];
    const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    
    let match;
    while ((match = articleRegex.exec(htmlContent)) !== null && items.length < 50) {
      const articleData = this.extractArticleDataAdvanced(match[1]);
      if (articleData && articleData.title && articleData.link) {
        items.push(this.createRssItem(articleData, source));
      }
    }
    
    return items;
  }
  
  // Strategy 2: Parse headline links
  private parseHeadlineLinks(htmlContent: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];
    const headlineRegex = /<h[1-6][^>]*>\s*<a[^>]*href="([^"]*the-decoder\.de[^"]*)"[^>]*>([^<]+)<\/a>\s*<\/h[1-6]>/gi;
    
    let match;
    while ((match = headlineRegex.exec(htmlContent)) !== null && items.length < 30) {
      const link = match[1];
      const title = this.cleanTitle(match[2]);
      
      if (title && link) {
        items.push(this.createRssItem({ title, link }, source));
      }
    }
    
    return items;
  }
  
  // Strategy 3: Parse content blocks
  private parseContentBlocks(htmlContent: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];
    const contentRegex = /<div[^>]*class="[^"]*(?:entry|post|content)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    
    let match;
    while ((match = contentRegex.exec(htmlContent)) !== null && items.length < 30) {
      const articleData = this.extractArticleDataAdvanced(match[1]);
      if (articleData && articleData.title && articleData.link) {
        items.push(this.createRssItem(articleData, source));
      }
    }
    
    return items;
  }
  
  // Strategy 4: Parse list items
  private parseListItems(htmlContent: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];
    const listRegex = /<li[^>]*class="[^"]*(?:post|entry)[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    
    let match;
    while ((match = listRegex.exec(htmlContent)) !== null && items.length < 20) {
      const articleData = this.extractArticleDataAdvanced(match[1]);
      if (articleData && articleData.title && articleData.link) {
        items.push(this.createRssItem(articleData, source));
      }
    }
    
    return items;
  }
  
  // Enhanced article data extraction
  private extractArticleDataAdvanced(content: string): any {
    // Extract title and link
    const titleLinkPatterns = [
      /<h[1-6][^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>\s*<\/h[1-6]>/i,
      /<a[^>]*href="([^"]+)"[^>]*>\s*<h[1-6][^>]*>([^<]+)<\/h[1-6]>\s*<\/a>/i,
      /<a[^>]*href="([^"]*the-decoder\.de[^"]*)"[^>]*>([^<]+)<\/a>/i,
      /<a[^>]*class="[^"]*permalink[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i
    ];
    
    let title = null;
    let link = null;
    
    for (const pattern of titleLinkPatterns) {
      const match = content.match(pattern);
      if (match) {
        link = match[1];
        title = match[2];
        if (title && link && title.trim().length > 3) break;
      }
    }
    
    // Extract image
    const imagePatterns = [
      /<img[^>]*src="([^"]+)"[^>]*(?:class="[^"]*featured[^"]*"|alt="[^"]*")/i,
      /<img[^>]*data-src="([^"]+)"[^>]*>/i
    ];
    
    let imageUrl;
    for (const pattern of imagePatterns) {
      const match = content.match(pattern);
      if (match && match[1] && !match[1].includes('data:')) {
        imageUrl = match[1].startsWith('http') ? match[1] : `https://the-decoder.de${match[1]}`;
        break;
      }
    }
    
    // Extract date
    const datePatterns = [
      /<time[^>]*datetime="([^"]+)"[^>]*>/i,
      /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i
    ];
    
    let pubDate = null;
    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          pubDate = new Date(match[1]).toISOString();
          if (!isNaN(new Date(pubDate).getTime())) break;
        } catch {
          continue;
        }
      }
    }
    
    return title && link ? { title, link, imageUrl, pubDate } : null;
  }
  
  // Create RSS item with defaults
  private createRssItem(data: any, source: RssSource): RssItem {
    const fullLink = data.link.startsWith('http') ? data.link : `https://the-decoder.de${data.link}`;
    
    return {
      title: this.cleanTitle(data.title),
      link: fullLink,
      pubDate: data.pubDate || new Date().toISOString(),
      description: `Aktueller Artikel von The Decoder: ${data.title}`,
      content: data.title,
      categories: ["The Decoder", "KI"],
      imageUrl: data.imageUrl,
      sourceUrl: source.url,
      sourceName: "The Decoder",
      guid: fullLink
    };
  }
  
  // Advanced deduplication
  private advancedDeduplication(items: RssItem[]): RssItem[] {
    const seen = new Set<string>();
    const unique = items.filter(item => {
      const normalizedUrl = item.link.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '');
      const normalizedTitle = item.title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
      const key = `${normalizedUrl}|${normalizedTitle.substring(0, 50)}`;
      
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`Deduplication: ${items.length} -> ${unique.length} articles`);
    return unique;
  }
  
  // Filter recent articles
  private filterRecentArticles(items: RssItem[], days: number): RssItem[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filtered = items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return true; // Include articles without valid dates
      }
      
      const pubDate = new Date(item.pubDate);
      return pubDate >= cutoffDate;
    });
    
    console.log(`Date filter (${days} days): ${items.length} -> ${filtered.length} articles`);
    return filtered;
  }
  
  // Clean article titles
  private cleanTitle(title: string): string {
    return title
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#8217;/g, "'")
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#8230;/g, '…')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  public async fetchRssSource(source: RssSource): Promise<RssItem[]> {
    console.log(`=== STARTING COMPREHENSIVE FETCH ===`);
    console.log(`Source: ${source.name} (${source.url})`);
    
    if (!source.url.includes('the-decoder.de')) {
      console.log(`Skipping non-Decoder source: ${source.name}`);
      return [];
    }
    
    const result = await this.fetchTheDecoderFeed(source);
    console.log(`=== FETCH COMPLETE: ${result.length} ARTICLES ===`);
    
    return result;
  }
}

export default RssFeedService;
