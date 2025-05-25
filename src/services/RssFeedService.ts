
import { RssItem, RssSource } from '../types/newsTypes';
import { toast } from "sonner";

/**
 * Service for fetching and parsing RSS feeds - Balanced approach for reliable news collection
 */
class RssFeedService {
  private corsProxies: string[] = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/get?url=",
    "https://api.codetabs.com/v1/proxy?quest=",
    "https://thingproxy.freeboard.io/fetch/"
  ];
  
  private currentProxyIndex: number = 0;
  private maxRetries: number = 2;
  
  // Blacklist for obvious non-news content
  private nonNewsPatterns = [
    '/about', '/ueber', '/kontakt', '/contact', '/impressum', '/imprint', 
    '/privacy', '/datenschutz', '/agb', '/terms', '/newsletter', '/subscribe',
    '/team', '/autor', '/author', '/jobs', '/karriere', '/werbung', '/advertising',
    '/category/page/', '/page/', '/feed/'
  ];
  
  constructor() {}
  
  private getCurrentProxy(): string {
    return this.corsProxies[this.currentProxyIndex];
  }
  
  private switchToNextProxy(): string {
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
    console.log(`Switching to proxy: ${this.getCurrentProxy()}`);
    return this.getCurrentProxy();
  }
  
  // Balanced The Decoder feed collection - reliable but focused on news
  private async fetchTheDecoderFeed(source: RssSource): Promise<RssItem[]> {
    console.log(`=== BALANCED DECODER COLLECTION ===`);
    console.log(`Target: Load news articles with balanced filtering`);
    
    try {
      // Focused on main news areas but not too restrictive
      const newsUrls = [
        // Primary KI and tech categories
        "https://the-decoder.de/category/ki/",
        "https://the-decoder.de/category/technologie/",
        "https://the-decoder.de/category/forschung/",
        "https://the-decoder.de/category/unternehmen/",
        
        // Main page for latest news
        "https://the-decoder.de/",
        
        // Key tags for comprehensive coverage
        "https://the-decoder.de/tag/openai/",
        "https://the-decoder.de/tag/chatgpt/",
        "https://the-decoder.de/tag/google/",
        "https://the-decoder.de/tag/microsoft/"
      ];
      
      const allItems: RssItem[] = [];
      let successCount = 0;
      
      console.log(`Starting balanced collection from ${newsUrls.length} news URLs...`);
      
      // Process URLs with better error handling
      for (const url of newsUrls) {
        try {
          const items = await this.fetchSinglePageRobust(url, source);
          if (items.length > 0) {
            allItems.push(...items);
            successCount++;
            console.log(`✅ ${url}: ${items.length} articles`);
          }
          
          // Prevent overloading
          if (allItems.length > 100) break;
          
        } catch (error) {
          console.warn(`❌ ${url}: Failed`, error);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log(`=== COLLECTION RESULTS ===`);
      console.log(`Successful URLs: ${successCount}/${newsUrls.length}`);
      console.log(`Raw articles collected: ${allItems.length}`);
      
      // Balanced processing - not too strict
      const filteredItems = this.filterObviousNonNews(allItems);
      const uniqueItems = this.basicDeduplication(filteredItems);
      
      console.log(`After basic filtering: ${filteredItems.length} articles`);
      console.log(`After deduplication: ${uniqueItems.length} articles`);
      console.log(`=== FINAL RESULT: ${uniqueItems.length} ARTICLES ===`);
      
      return uniqueItems;
      
    } catch (error) {
      console.error("Error in news collection:", error);
      toast.error("Fehler beim Laden der Nachrichten");
      return [];
    }
  }
  
  // Basic filtering to remove obvious non-news content
  private filterObviousNonNews(items: RssItem[]): RssItem[] {
    return items.filter(item => {
      const url = item.link.toLowerCase();
      const title = item.title.toLowerCase();
      
      // Check for obvious non-news patterns
      if (this.nonNewsPatterns.some(pattern => url.includes(pattern))) {
        console.log(`Filtered obvious non-news: ${item.title}`);
        return false;
      }
      
      // Basic title validation
      if (title.includes('über uns') || title.includes('kontakt') || 
          title.includes('impressum') || title.includes('datenschutz') ||
          item.title.length < 5) {
        console.log(`Filtered non-news title: ${item.title}`);
        return false;
      }
      
      return true;
    });
  }
  
  // Robust single page fetching with better error handling
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
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const htmlContent = await response.text();
          
          if (htmlContent.length < 500) {
            throw new Error("Content too short");
          }
          
          const items = this.parseDecoderHTML(htmlContent, source);
          
          if (items.length > 0) {
            console.log(`🔄 ${url}: ${items.length} articles found`);
            return items;
          }
          
        } catch (error) {
          console.warn(`Attempt ${attempt}, Proxy ${proxyIndex + 1} failed for ${url}:`, error);
        }
      }
      
      if (attempt < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.error(`❌ All attempts failed for ${url}`);
    return [];
  }
  
  // Improved HTML parsing for The Decoder with better title extraction
  private parseDecoderHTML(htmlContent: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];
    
    // Enhanced patterns to capture better titles
    const linkPatterns = [
      // Article titles in h2/h3 tags with links
      /<h[2-3][^>]*><a[^>]*href="(https:\/\/the-decoder\.de\/[^"]*)"[^>]*>([^<]+)<\/a><\/h[2-3]>/gi,
      // Entry title pattern
      /<(?:h2|h3)[^>]*class="[^"]*entry-title[^"]*"[^>]*><a[^>]*href="(https:\/\/the-decoder\.de\/[^"]*)"[^>]*>([^<]+)<\/a><\/(?:h2|h3)>/gi,
      // Article card patterns
      /<article[^>]*>[\s\S]*?<a[^>]*href="(https:\/\/the-decoder\.de\/[^"]*)"[^>]*>[\s\S]*?<h[2-4][^>]*>([^<]+)<\/h[2-4]>[\s\S]*?<\/article>/gi,
      // General link patterns as fallback
      /<a[^>]*href="(https:\/\/the-decoder\.de\/[^"]*)"[^>]*[^>]*title="([^"]+)"[^>]*>/gi
    ];
    
    for (const pattern of linkPatterns) {
      let match;
      while ((match = pattern.exec(htmlContent)) !== null && items.length < 50) {
        const link = match[1];
        let title = this.cleanTitle(match[2]);
        
        // Skip if title looks like a URL or is too short
        if (this.isValidTitle(title) && this.isValidNewsArticle(link, title)) {
          items.push(this.createRssItem({ title, link }, source));
        }
      }
    }
    
    // If no good titles found, try to extract from meta tags or other sources
    if (items.length === 0) {
      const metaTitlePattern = /<meta[^>]*property="og:title"[^>]*content="([^"]+)"[^>]*>/gi;
      let match;
      while ((match = metaTitlePattern.exec(htmlContent)) !== null && items.length < 10) {
        const title = this.cleanTitle(match[1]);
        if (this.isValidTitle(title)) {
          // Try to find corresponding URL
          const urlPattern = new RegExp(`<meta[^>]*property="og:url"[^>]*content="(https://the-decoder\\.de/[^"]*)"[^>]*>`, 'gi');
          const urlMatch = urlPattern.exec(htmlContent);
          if (urlMatch && this.isValidNewsArticle(urlMatch[1], title)) {
            items.push(this.createRssItem({ title, link: urlMatch[1] }, source));
          }
        }
      }
    }
    
    console.log(`Parsed ${items.length} articles from page`);
    return items;
  }
  
  // Validate if the title looks like a proper title (not a URL)
  private isValidTitle(title: string): boolean {
    if (!title) return false;
    
    // Check if title looks like a URL
    if (title.startsWith('http') || title.includes('://') || title.includes('.com') || title.includes('.de')) {
      return false;
    }
    
    // Check length
    if (title.length < 10 || title.length > 200) {
      return false;
    }
    
    // Check for meaningful content (not just numbers or symbols)
    const meaningfulContent = /[a-zA-ZäöüÄÖÜß]/.test(title);
    if (!meaningfulContent) {
      return false;
    }
    
    return true;
  }
  
  // Validate if this looks like a real news article
  private isValidNewsArticle(link: string, title: string): boolean {
    if (!link || !title) return false;
    
    const url = link.toLowerCase();
    const titleLower = title.toLowerCase();
    
    // Must be a proper Decoder article URL
    if (!url.includes('the-decoder.de') || url.includes('/page/')) {
      return false;
    }
    
    // Basic content validation
    if (!this.isValidTitle(title)) {
      return false;
    }
    
    // Check for obvious non-news content
    const nonNewsKeywords = ['über uns', 'kontakt', 'impressum', 'datenschutz', 'newsletter'];
    if (nonNewsKeywords.some(keyword => titleLower.includes(keyword))) {
      return false;
    }
    
    return true;
  }
  
  // Create RSS item with current date if no date found
  private createRssItem(data: any, source: RssSource): RssItem {
    const fullLink = data.link.startsWith('http') ? data.link : `https://the-decoder.de${data.link}`;
    
    return {
      title: this.cleanTitle(data.title),
      link: fullLink,
      pubDate: data.pubDate || new Date().toISOString(), // Use current date if none found
      description: `KI-News von The Decoder: ${data.title}`,
      content: data.title,
      categories: ["KI", "The Decoder"],
      sourceUrl: source.url,
      sourceName: "The Decoder",
      guid: fullLink
    };
  }
  
  // Basic deduplication
  private basicDeduplication(items: RssItem[]): RssItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = item.link.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  // Enhanced title cleaning
  private cleanTitle(title: string): string {
    if (!title) return "Artikel ohne Titel";
    
    let cleaned = title
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
    
    // If cleaned title is still a URL or empty, provide fallback
    if (!cleaned || cleaned.startsWith('http') || cleaned.includes('://')) {
      cleaned = "Artikel ohne Titel";
    }
    
    return cleaned;
  }
  
  public async fetchRssSource(source: RssSource): Promise<RssItem[]> {
    console.log(`=== FETCHING NEWS FROM ${source.name} ===`);
    
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
