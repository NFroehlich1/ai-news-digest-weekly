
import { RssItem, RssSource } from '../types/newsTypes';
import { toast } from "sonner";

/**
 * Service for fetching and parsing RSS feeds - Enhanced for accurate news-only collection
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
  
  // Blacklist for non-news URLs and content
  private nonNewsPatterns = [
    '/about', '/ueber', '/kontakt', '/contact', '/impressum', '/imprint', 
    '/privacy', '/datenschutz', '/agb', '/terms', '/newsletter', '/subscribe',
    '/team', '/autor', '/author', '/jobs', '/karriere', '/werbung', '/advertising'
  ];
  
  private nonNewsTitles = [
    'über uns', 'about us', 'kontakt', 'contact', 'impressum', 'imprint',
    'datenschutz', 'privacy', 'agb', 'terms', 'newsletter', 'subscribe',
    'team', 'autor', 'redaktion', 'werbung', 'jobs', 'karriere'
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
  
  // Enhanced The Decoder feed collection - news-only focused
  private async fetchTheDecoderFeed(source: RssSource): Promise<RssItem[]> {
    console.log(`=== NEWS-ONLY DECODER COLLECTION ===`);
    console.log(`Target: Load current week news articles only`);
    
    try {
      // Focused URLs for news content only
      const newsUrls = [
        // KI category - most important for our use case
        "https://the-decoder.de/category/ki/",
        "https://the-decoder.de/category/ki/page/2/",
        "https://the-decoder.de/category/ki/page/3/",
        "https://the-decoder.de/category/ki/page/4/",
        
        // Technology category
        "https://the-decoder.de/category/technologie/",
        "https://the-decoder.de/category/technologie/page/2/",
        "https://the-decoder.de/category/technologie/page/3/",
        
        // Research category
        "https://the-decoder.de/category/forschung/",
        "https://the-decoder.de/category/forschung/page/2/",
        
        // Companies category
        "https://the-decoder.de/category/unternehmen/",
        "https://the-decoder.de/category/unternehmen/page/2/",
        
        // Main page - limited to first 2 pages only
        "https://the-decoder.de/",
        "https://the-decoder.de/page/2/",
        
        // Key technology tags
        "https://the-decoder.de/tag/openai/",
        "https://the-decoder.de/tag/chatgpt/",
        "https://the-decoder.de/tag/google/",
        "https://the-decoder.de/tag/microsoft/",
        "https://the-decoder.de/tag/meta/",
        "https://the-decoder.de/tag/anthropic/"
      ];
      
      const allItems: RssItem[] = [];
      let successCount = 0;
      let failCount = 0;
      
      console.log(`Starting collection from ${newsUrls.length} news URLs...`);
      
      // Process in smaller batches for better quality control
      const batchSize = 3;
      for (let i = 0; i < newsUrls.length; i += batchSize) {
        const batch = newsUrls.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newsUrls.length/batchSize)}`);
        
        const batchPromises = batch.map(url => this.fetchSinglePageRobust(url, source));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            allItems.push(...result.value);
            successCount++;
            console.log(`✅ ${batch[index]}: ${result.value.length} news articles`);
          } else {
            failCount++;
            console.log(`❌ ${batch[index]}: Failed or no news found`);
          }
        });
        
        console.log(`Progress: ${allItems.length} articles collected so far`);
        
        // Small delay between batches
        if (i + batchSize < newsUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`=== COLLECTION RESULTS ===`);
      console.log(`URLs processed: ${newsUrls.length}`);
      console.log(`Successful: ${successCount}, Failed: ${failCount}`);
      console.log(`Raw articles collected: ${allItems.length}`);
      
      // Enhanced processing with news-only focus
      const newsOnlyItems = this.filterNewsArticlesOnly(allItems);
      const uniqueItems = this.advancedDeduplication(newsOnlyItems);
      const currentWeekItems = this.filterCurrentWeekStrict(uniqueItems);
      
      console.log(`After news filtering: ${newsOnlyItems.length} articles`);
      console.log(`After deduplication: ${uniqueItems.length} articles`);
      console.log(`Current week only: ${currentWeekItems.length} articles`);
      console.log(`=== FINAL RESULT: ${currentWeekItems.length} NEWS ARTICLES ===`);
      
      return currentWeekItems;
      
    } catch (error) {
      console.error("Critical error in news collection:", error);
      toast.error("Fehler beim Laden der Nachrichten");
      return [];
    }
  }
  
  // Filter to ensure only news articles are included
  private filterNewsArticlesOnly(items: RssItem[]): RssItem[] {
    return items.filter(item => {
      // Check URL for non-news patterns
      const url = item.link.toLowerCase();
      if (this.nonNewsPatterns.some(pattern => url.includes(pattern))) {
        console.log(`Filtered out non-news URL: ${item.link}`);
        return false;
      }
      
      // Check title for non-news content
      const title = item.title.toLowerCase();
      if (this.nonNewsTitles.some(nonNewsTitle => title.includes(nonNewsTitle))) {
        console.log(`Filtered out non-news title: ${item.title}`);
        return false;
      }
      
      // Must have proper article URL structure for The Decoder
      if (!url.includes('the-decoder.de') || url.includes('/page/')) {
        return false;
      }
      
      // Article URLs should have date or specific patterns
      const hasArticlePattern = /\/\d{4}\/\d{2}\/|\/[a-z-]+\/$/.test(url);
      if (!hasArticlePattern) {
        console.log(`Filtered out non-article URL pattern: ${item.link}`);
        return false;
      }
      
      // Title should have minimum length for real articles
      if (item.title.length < 10) {
        console.log(`Filtered out too short title: ${item.title}`);
        return false;
      }
      
      return true;
    });
  }
  
  // Strict current week filtering
  private filterCurrentWeekStrict(items: RssItem[]): RssItem[] {
    const now = new Date();
    const currentWeekStart = this.getWeekStart(now);
    const currentWeekEnd = this.getWeekEnd(now);
    
    console.log(`=== STRICT CURRENT WEEK FILTER ===`);
    console.log(`Week range: ${currentWeekStart.toISOString()} to ${currentWeekEnd.toISOString()}`);
    
    const filtered = items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        console.log(`Filtered out article without valid date: ${item.title}`);
        return false;
      }
      
      const pubDate = new Date(item.pubDate);
      const isCurrentWeek = pubDate >= currentWeekStart && pubDate <= currentWeekEnd;
      
      if (!isCurrentWeek) {
        console.log(`Filtered out article from different week: ${item.title} (${pubDate.toISOString()})`);
      }
      
      return isCurrentWeek;
    });
    
    console.log(`Strict week filter: ${items.length} -> ${filtered.length} articles`);
    return filtered;
  }
  
  // Get start of current week (Monday)
  private getWeekStart(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  
  // Get end of current week (Sunday)
  private getWeekEnd(date: Date): Date {
    const end = new Date(date);
    const day = end.getDay();
    const diff = end.getDate() - day + (day === 0 ? 0 : 7); // Sunday as end
    end.setDate(diff);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  
  // Robust single page fetching
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
          
          const items = this.parseDecoderHTMLNewsOnly(htmlContent, source);
          
          if (items.length > 0) {
            console.log(`🔄 ${url} via ${proxy}: ${items.length} news articles`);
            return items;
          }
          
        } catch (error) {
          console.warn(`Attempt ${attempt}, Proxy ${proxyIndex + 1} failed for ${url}:`, error);
        }
      }
      
      if (attempt < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    console.error(`❌ All attempts failed for ${url}`);
    return [];
  }
  
  // Enhanced HTML parsing focused on news articles only
  private parseDecoderHTMLNewsOnly(htmlContent: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];
    
    // Focus on article-specific selectors only
    const articleRegex = /<article[^>]*class="[^"]*(?:post|entry)[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    
    let match;
    while ((match = articleRegex.exec(htmlContent)) !== null && items.length < 30) {
      const articleData = this.extractNewsArticleData(match[1]);
      if (articleData && this.validateNewsArticle(articleData)) {
        items.push(this.createRssItem(articleData, source));
      }
    }
    
    // Fallback: look for news-specific headline patterns
    if (items.length < 10) {
      const headlineRegex = /<h[2-3][^>]*>\s*<a[^>]*href="([^"]*the-decoder\.de\/\d{4}\/[^"]*)"[^>]*>([^<]+)<\/a>\s*<\/h[2-3]>/gi;
      
      while ((match = headlineRegex.exec(htmlContent)) !== null && items.length < 30) {
        const link = match[1];
        const title = this.cleanTitle(match[2]);
        
        if (title && link && this.validateNewsArticle({ title, link })) {
          items.push(this.createRssItem({ title, link }, source));
        }
      }
    }
    
    console.log(`Extracted ${items.length} news articles from page`);
    return items;
  }
  
  // Extract article data with enhanced date parsing
  private extractNewsArticleData(content: string): any {
    // Extract title and link with news-specific patterns
    const titleLinkPatterns = [
      /<h[2-3][^>]*>\s*<a[^>]*href="([^"]*the-decoder\.de\/\d{4}\/[^"]*)"[^>]*>([^<]+)<\/a>\s*<\/h[2-3]>/i,
      /<a[^>]*href="([^"]*the-decoder\.de\/\d{4}\/[^"]*)"[^>]*>\s*<h[2-3][^>]*>([^<]+)<\/h[2-3]>\s*<\/a>/i
    ];
    
    let title = null;
    let link = null;
    
    for (const pattern of titleLinkPatterns) {
      const match = content.match(pattern);
      if (match) {
        link = match[1];
        title = match[2];
        if (title && link && title.trim().length > 10) break;
      }
    }
    
    // Enhanced date extraction for German formats
    const datePatterns = [
      /<time[^>]*datetime="([^"]+)"[^>]*>/i,
      /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i,
      /(\d{1,2})\.\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{4})/i,
      /(\d{4})-(\d{2})-(\d{2})/i
    ];
    
    let pubDate = null;
    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          if (match[2] && match[3]) {
            // German month names
            const monthMap: Record<string, string> = {
              'Januar': '01', 'Februar': '02', 'März': '03', 'April': '04',
              'Mai': '05', 'Juni': '06', 'Juli': '07', 'August': '08',
              'September': '09', 'Oktober': '10', 'November': '11', 'Dezember': '12'
            };
            const month = monthMap[match[2]];
            if (month) {
              pubDate = new Date(`${match[3]}-${month}-${match[1].padStart(2, '0')}`).toISOString();
            }
          } else {
            pubDate = new Date(match[1]).toISOString();
          }
          if (!isNaN(new Date(pubDate).getTime())) break;
        } catch {
          continue;
        }
      }
    }
    
    return title && link ? { title, link, pubDate } : null;
  }
  
  // Validate if this is actually a news article
  private validateNewsArticle(data: any): boolean {
    if (!data.title || !data.link) return false;
    
    const url = data.link.toLowerCase();
    const title = data.title.toLowerCase();
    
    // Must be from The Decoder with proper article URL structure
    if (!url.includes('the-decoder.de') || !url.match(/\/\d{4}\/\d{2}\//)) {
      return false;
    }
    
    // Check against non-news patterns
    if (this.nonNewsPatterns.some(pattern => url.includes(pattern))) {
      return false;
    }
    
    if (this.nonNewsTitles.some(nonNewsTitle => title.includes(nonNewsTitle))) {
      return false;
    }
    
    // News articles should have substantial titles
    if (data.title.length < 10 || data.title.length > 200) {
      return false;
    }
    
    return true;
  }
  
  // Create RSS item with enhanced validation
  private createRssItem(data: any, source: RssSource): RssItem {
    const fullLink = data.link.startsWith('http') ? data.link : `https://the-decoder.de${data.link}`;
    
    return {
      title: this.cleanTitle(data.title),
      link: fullLink,
      pubDate: data.pubDate || new Date().toISOString(),
      description: `KI-News von The Decoder: ${data.title}`,
      content: data.title,
      categories: ["KI", "The Decoder"],
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
    console.log(`=== STARTING NEWS-ONLY FETCH ===`);
    console.log(`Source: ${source.name} (${source.url})`);
    
    if (!source.url.includes('the-decoder.de')) {
      console.log(`Skipping non-Decoder source: ${source.name}`);
      return [];
    }
    
    const result = await this.fetchTheDecoderFeed(source);
    console.log(`=== FETCH COMPLETE: ${result.length} NEWS ARTICLES ===`);
    
    return result;
  }
}

export default RssFeedService;
