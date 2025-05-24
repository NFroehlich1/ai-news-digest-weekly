
import { RssItem, RssSource } from '../types/newsTypes';
import { toast } from "sonner";

/**
 * Service for fetching and parsing RSS feeds - optimized for comprehensive The Decoder coverage
 */
class RssFeedService {
  private corsProxies: string[] = [
    "https://api.allorigins.win/get?url=",
    "https://corsproxy.io/?",
    "https://api.codetabs.com/v1/proxy?quest=",
    "https://thingproxy.freeboard.io/fetch/"
  ];
  
  private currentProxyIndex: number = 0;
  private maxRetries: number = 2;
  
  constructor() {}
  
  private getCurrentProxy(): string {
    return this.corsProxies[this.currentProxyIndex];
  }
  
  private switchToNextProxy(): string {
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
    console.log(`Switching to proxy: ${this.getCurrentProxy()}`);
    return this.getCurrentProxy();
  }
  
  // Comprehensive handling for The Decoder website with maximum article coverage
  private async fetchTheDecoderFeed(source: RssSource): Promise<RssItem[]> {
    try {
      console.log("Comprehensive The Decoder feed - fetching maximum article collection for full week coverage");
      
      // Extensive URL list for comprehensive coverage (25+ pages)
      const urls = [
        // Main pages (current and recent)
        "https://the-decoder.de/",
        "https://the-decoder.de/page/2/",
        "https://the-decoder.de/page/3/",
        "https://the-decoder.de/page/4/",
        "https://the-decoder.de/page/5/",
        "https://the-decoder.de/page/6/",
        "https://the-decoder.de/page/7/",
        "https://the-decoder.de/page/8/",
        
        // KI category (main focus)
        "https://the-decoder.de/category/ki/",
        "https://the-decoder.de/category/ki/page/2/",
        "https://the-decoder.de/category/ki/page/3/",
        "https://the-decoder.de/category/ki/page/4/",
        "https://the-decoder.de/category/ki/page/5/",
        
        // Technology category
        "https://the-decoder.de/category/technologie/",
        "https://the-decoder.de/category/technologie/page/2/",
        "https://the-decoder.de/category/technologie/page/3/",
        "https://the-decoder.de/category/technologie/page/4/",
        
        // Research category
        "https://the-decoder.de/category/forschung/",
        "https://the-decoder.de/category/forschung/page/2/",
        "https://the-decoder.de/category/forschung/page/3/",
        
        // Companies category
        "https://the-decoder.de/category/unternehmen/",
        "https://the-decoder.de/category/unternehmen/page/2/",
        "https://the-decoder.de/category/unternehmen/page/3/",
        
        // Additional specific tags for comprehensive coverage
        "https://the-decoder.de/tag/openai/",
        "https://the-decoder.de/tag/chatgpt/",
        "https://the-decoder.de/tag/google/",
        "https://the-decoder.de/tag/microsoft/",
        "https://the-decoder.de/tag/meta/",
        "https://the-decoder.de/tag/anthropic/",
        "https://the-decoder.de/tag/machine-learning/",
        "https://the-decoder.de/tag/deep-learning/"
      ];
      
      const allItems: RssItem[] = [];
      const promises: Promise<void>[] = [];
      
      // Process URLs in parallel batches for better performance
      const batchSize = 5;
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        
        for (const url of batch) {
          const promise = this.fetchSinglePage(url, source, allItems);
          promises.push(promise);
        }
        
        // Wait for current batch to complete before starting next
        await Promise.allSettled(promises.splice(0, batchSize));
        
        // Small delay between batches to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Wait for any remaining promises
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
      
      // Remove duplicates and filter for recent articles (extended to 14 days for better week coverage)
      const uniqueItems = this.removeDuplicatesByUrl(allItems);
      const recentItems = this.filterRecentArticles(uniqueItems, 14); // Extended from 30 to 14 days
      const sortedItems = recentItems.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      
      console.log(`Successfully extracted ${sortedItems.length} unique recent articles from The Decoder`);
      console.log(`Total unique articles before date filtering: ${uniqueItems.length}`);
      console.log(`Articles after 14-day filter: ${recentItems.length}`);
      
      return sortedItems.slice(0, 150); // Increased from 50 to 150 articles
    } catch (error) {
      console.error("Error in comprehensive The Decoder handling:", error);
      return [];
    }
  }
  
  // Helper method to fetch a single page
  private async fetchSinglePage(url: string, source: RssSource, allItems: RssItem[]): Promise<void> {
    try {
      console.log(`Fetching from: ${url}`);
      const response = await fetch(`https://corsproxy.io/?${url}`, {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (compatible; NewsDigestApp/1.0)'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch ${url}: ${response.status}`);
        return;
      }
      
      const htmlContent = await response.text();
      const items = this.parseDecoderHTML(htmlContent, source);
      allItems.push(...items);
      
      console.log(`Extracted ${items.length} articles from ${url}`);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
    }
  }
  
  // Enhanced HTML parsing for The Decoder with increased limits
  private parseDecoderHTML(htmlContent: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];
    
    // Comprehensive article selectors for The Decoder
    const articleSelectors = [
      // Main article cards
      /<article[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
      /<div[^>]*class="[^"]*entry[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      // Grid layout items
      /<div[^>]*class="[^"]*grid-item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      // List items
      /<li[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
      // Content blocks
      /<section[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
      // Additional selectors for better coverage
      /<h[1-6][^>]*>\s*<a[^>]*href="[^"]*the-decoder\.de[^"]*"[^>]*>[\s\S]*?<\/a>\s*<\/h[1-6]>/gi,
      /<a[^>]*href="[^"]*the-decoder\.de[^"]*"[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<\/a>/gi
    ];
    
    for (const regex of articleSelectors) {
      let article;
      while ((article = regex.exec(htmlContent)) !== null && items.length < 200) { // Increased limit from 100 to 200
        try {
          const articleContent = article[1];
          const articleData = this.extractArticleData(articleContent);
          
          if (articleData && articleData.title && articleData.link) {
            const fullLink = articleData.link.startsWith('http') 
              ? articleData.link 
              : `https://the-decoder.de${articleData.link}`;
              
            items.push({
              title: this.cleanTitle(articleData.title),
              link: fullLink,
              pubDate: articleData.pubDate || new Date().toISOString(),
              description: this.generateDescription(articleData.title, articleData.excerpt),
              content: articleData.excerpt || articleData.title,
              categories: this.extractCategories(articleData.title, articleContent),
              imageUrl: articleData.imageUrl,
              sourceUrl: source.url,
              sourceName: "The Decoder"
            });
          }
        } catch (itemError) {
          console.error("Error extracting The Decoder article:", itemError);
        }
      }
    }
    
    return items;
  }
  
  // Enhanced article data extraction with multiple fallback patterns
  private extractArticleData(articleContent: string): any {
    // Multiple title and link extraction patterns
    const titleLinkPatterns = [
      // Standard link with title
      /<h[1-6][^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>\s*<\/h[1-6]>/i,
      /<a[^>]*href="([^"]+)"[^>]*>\s*<h[1-6][^>]*>([^<]+)<\/h[1-6]>\s*<\/a>/i,
      // Title with separate link
      /<h[1-6][^>]*>([^<]+)<\/h[1-6]>[^<]*<a[^>]*href="([^"]+)"/i,
      // Permalink patterns
      /<a[^>]*class="[^"]*permalink[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i,
      /<a[^>]*rel="bookmark"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i,
      // Entry title patterns
      /<div[^>]*class="[^"]*entry-title[^"]*"[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i,
      // Direct link patterns
      /<a[^>]*href="([^"]*the-decoder\.de[^"]*)"[^>]*>([^<]+)<\/a>/i
    ];
    
    let title = null;
    let link = null;
    
    for (const pattern of titleLinkPatterns) {
      const match = articleContent.match(pattern);
      if (match) {
        link = match[1];
        title = match[2];
        if (title && link) break;
      }
    }
    
    // Image extraction with multiple patterns
    const imagePatterns = [
      /<img[^>]*src="([^"]+)"[^>]*class="[^"]*featured[^"]*"/i,
      /<img[^>]*class="[^"]*featured[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*src="([^"]+)"[^>]*alt="[^"]*"/i,
      /<img[^>]*data-src="([^"]+)"[^>]*>/i,
      /background-image:\s*url\(['"]([^'"]+)['"]\)/i,
      /<picture[^>]*>.*?<img[^>]*src="([^"]+)"[^>]*>.*?<\/picture>/i
    ];
    
    let imageUrl = undefined;
    for (const pattern of imagePatterns) {
      const match = articleContent.match(pattern);
      if (match && match[1]) {
        const url = match[1];
        if (url.includes('http') || url.startsWith('/')) {
          imageUrl = url.startsWith('http') ? url : `https://the-decoder.de${url}`;
          break;
        }
      }
    }
    
    // Enhanced date extraction with improved German date recognition
    const datePatterns = [
      /<time[^>]*datetime="([^"]+)"[^>]*>/i,
      /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i,
      /<div[^>]*class="[^"]*published[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<meta[^>]*property="article:published_time"[^>]*content="([^"]+)"/i,
      /(\d{1,2}\.\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*\d{4})/i,
      /(\d{4}-\d{2}-\d{2})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/i
    ];
    
    let pubDate = null;
    for (const pattern of datePatterns) {
      const match = articleContent.match(pattern);
      if (match) {
        try {
          const dateStr = match[1];
          // Handle German date format
          if (dateStr.includes('Januar') || dateStr.includes('Februar') || dateStr.includes('März') || 
              dateStr.includes('April') || dateStr.includes('Mai') || dateStr.includes('Juni') ||
              dateStr.includes('Juli') || dateStr.includes('August') || dateStr.includes('September') ||
              dateStr.includes('Oktober') || dateStr.includes('November') || dateStr.includes('Dezember')) {
            const germanToEnglish = {
              'Januar': 'January', 'Februar': 'February', 'März': 'March',
              'April': 'April', 'Mai': 'May', 'Juni': 'June',
              'Juli': 'July', 'August': 'August', 'September': 'September',
              'Oktober': 'October', 'November': 'November', 'Dezember': 'December'
            };
            let englishDate = dateStr;
            Object.entries(germanToEnglish).forEach(([german, english]) => {
              englishDate = englishDate.replace(german, english);
            });
            pubDate = new Date(englishDate).toISOString();
          } else {
            pubDate = new Date(dateStr).toISOString();
          }
          break;
        } catch {
          continue;
        }
      }
    }
    
    // Enhanced excerpt extraction
    const excerptPatterns = [
      /<p[^>]*class="[^"]*excerpt[^"]*"[^>]*>([^<]+)<\/p>/i,
      /<div[^>]*class="[^"]*summary[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>.*?<p[^>]*>([^<]{50,300})<\/p>/i,
      /<p[^>]*>([^<]{50,200})<\/p>/i
    ];
    
    let excerpt = null;
    for (const pattern of excerptPatterns) {
      const match = articleContent.match(pattern);
      if (match && match[1]) {
        excerpt = this.cleanText(match[1]);
        if (excerpt.length > 30) break;
      }
    }
    
    return title && link ? { title, link, imageUrl, pubDate, excerpt } : null;
  }
  
  // Clean and enhance article titles
  private cleanTitle(title: string): string {
    return title
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#8217;/g, "'")
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#8230;/g, '…')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Clean text content
  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Generate professional descriptions with excerpt integration
  private generateDescription(title: string, excerpt?: string): string {
    if (excerpt && excerpt.length > 20) {
      return `${excerpt.substring(0, 200)}${excerpt.length > 200 ? '...' : ''}`;
    }
    
    const keyWords = title.toLowerCase();
    if (keyWords.includes('ki') || keyWords.includes('ai') || keyWords.includes('künstlich')) {
      return `Aktuelle Entwicklungen im Bereich Künstliche Intelligenz: ${title}`;
    } else if (keyWords.includes('technologie') || keyWords.includes('tech')) {
      return `Technologie-News: ${title}`;
    } else if (keyWords.includes('forschung') || keyWords.includes('research')) {
      return `Neueste Forschungsergebnisse: ${title}`;
    }
    return `Professioneller Artikel von The Decoder: ${title}`;
  }
  
  // Extract relevant categories from content
  private extractCategories(title: string, content: string): string[] {
    const categories = ["The Decoder"];
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // AI/KI related
    if (titleLower.includes('ki') || titleLower.includes('ai') || titleLower.includes('künstlich') ||
        contentLower.includes('artificial intelligence') || contentLower.includes('machine learning')) {
      categories.push("Künstliche Intelligenz", "KI");
    }
    
    // Technology
    if (titleLower.includes('tech') || titleLower.includes('innovation') || titleLower.includes('digital')) {
      categories.push("Technologie");
    }
    
    // Research
    if (titleLower.includes('forschung') || titleLower.includes('research') || titleLower.includes('studie')) {
      categories.push("Forschung");
    }
    
    // Companies
    if (titleLower.includes('google') || titleLower.includes('microsoft') || titleLower.includes('openai') ||
        titleLower.includes('meta') || titleLower.includes('apple') || titleLower.includes('amazon')) {
      categories.push("Unternehmen");
    }
    
    return categories;
  }
  
  // Filter articles from the last 14 days (improved for better week coverage)
  private filterRecentArticles(items: RssItem[], days: number = 14): RssItem[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    console.log(`Filtering articles newer than: ${cutoffDate.toISOString()}`);
    
    const filteredItems = items.filter(item => {
      try {
        const itemDate = new Date(item.pubDate);
        const isRecent = itemDate >= cutoffDate;
        if (!isRecent) {
          console.log(`Filtered out old article: ${item.title} (${itemDate.toISOString()})`);
        }
        return isRecent;
      } catch {
        // Include items with invalid dates, but set them to current week
        console.log(`Article with invalid date included: ${item.title}`);
        item.pubDate = new Date().toISOString();
        return true;
      }
    });
    
    console.log(`Articles after ${days}-day filter: ${filteredItems.length} out of ${items.length}`);
    return filteredItems;
  }
  
  // Remove duplicate articles by URL
  private removeDuplicatesByUrl(items: RssItem[]): RssItem[] {
    const seen = new Set<string>();
    const uniqueItems = items.filter(item => {
      const key = item.link.toLowerCase().replace(/\/$/, ''); // Remove trailing slash
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    
    console.log(`Removed ${items.length - uniqueItems.length} duplicate articles`);
    return uniqueItems;
  }
  
  public async fetchRssSource(source: RssSource): Promise<RssItem[]> {
    console.log(`Starting comprehensive fetch for The Decoder: ${source.name}`);
    
    // Only process The Decoder feeds
    if (!source.url.includes('the-decoder.de')) {
      console.log(`Skipping non-Decoder source: ${source.name}`);
      return [];
    }
    
    return this.fetchTheDecoderFeed(source);
  }
}

export default RssFeedService;
