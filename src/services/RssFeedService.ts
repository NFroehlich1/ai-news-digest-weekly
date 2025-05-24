import { RssItem, RssSource } from '../types/newsTypes';
import { toast } from "sonner";

/**
 * Service for fetching and parsing RSS feeds
 */
class RssFeedService {
  private corsProxies: string[] = [
    "https://api.allorigins.win/get?url=",
    "https://corsproxy.io/?",
    "https://api.codetabs.com/v1/proxy?quest=",
    "https://thingproxy.freeboard.io/fetch/",
    "https://cors-anywhere.herokuapp.com/"
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
  
  private extractXmlFromResponse(response: any): string {
    if (response && typeof response === 'object' && response.contents) {
      return response.contents;
    }
    return response;
  }
  
  // Enhanced handling for The Decoder website with more articles
  private async fetchTheDecoderFeed(source: RssSource): Promise<RssItem[]> {
    try {
      console.log("Enhanced handling for The Decoder feed - fetching more articles");
      
      // Fetch main page and category pages for more comprehensive coverage
      const urls = [
        "https://the-decoder.de/",
        "https://the-decoder.de/category/ki/", 
        "https://the-decoder.de/category/technologie/",
        "https://the-decoder.de/page/2/"  // Second page for more articles
      ];
      
      const allItems: RssItem[] = [];
      
      for (const url of urls) {
        try {
          const response = await fetch(`https://corsproxy.io/?${url}`, {
            headers: {
              'Accept': 'text/html',
              'User-Agent': 'Mozilla/5.0 (compatible; NewsDigestApp/1.0)'
            },
            cache: 'no-store'
          });
          
          if (!response.ok) {
            console.warn(`Failed to fetch ${url}: ${response.status}`);
            continue;
          }
          
          const htmlContent = await response.text();
          const items = this.parseDecoderHTML(htmlContent, source);
          allItems.push(...items);
          
          console.log(`Extracted ${items.length} articles from ${url}`);
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
        }
      }
      
      // Remove duplicates by URL and sort by date
      const uniqueItems = this.removeDuplicatesByUrl(allItems);
      const sortedItems = uniqueItems.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      
      console.log(`Successfully extracted ${sortedItems.length} unique articles from The Decoder`);
      return sortedItems.slice(0, 30); // Return up to 30 most recent articles
    } catch (error) {
      console.error("Error in enhanced The Decoder handling:", error);
      return this.fallbackToStandardFetch(source);
    }
  }
  
  // Enhanced HTML parsing for The Decoder
  private parseDecoderHTML(htmlContent: string, source: RssSource): RssItem[] {
    const items: RssItem[] = [];
    
    // Multiple article selectors for better coverage
    const articleSelectors = [
      /<article[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
      /<div[^>]*class="[^"]*entry[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    ];
    
    for (const regex of articleSelectors) {
      let article;
      while ((article = regex.exec(htmlContent)) !== null && items.length < 50) {
        try {
          const articleContent = article[1];
          const articleData = this.extractArticleData(articleContent);
          
          if (articleData && articleData.title && articleData.link) {
            // Ensure we have full URLs
            const fullLink = articleData.link.startsWith('http') 
              ? articleData.link 
              : `https://the-decoder.de${articleData.link}`;
              
            items.push({
              title: this.cleanTitle(articleData.title),
              link: fullLink,
              pubDate: articleData.pubDate || new Date().toISOString(),
              description: this.generateDescription(articleData.title),
              content: articleData.excerpt || "",
              categories: ["KI", "Technologie", "The Decoder", "Künstliche Intelligenz"],
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
  
  // Extract article data with multiple fallback patterns
  private extractArticleData(articleContent: string): any {
    // Title extraction with multiple patterns
    const titlePatterns = [
      /<h[1-6][^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i,
      /<a[^>]*href="([^"]+)"[^>]*>\s*<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i,
      /<h[1-6][^>]*>([^<]+)<\/h[1-6]>[^<]*<a[^>]*href="([^"]+)"/i,
      /<a[^>]*class="[^"]*permalink[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i
    ];
    
    let title = null;
    let link = null;
    
    for (const pattern of titlePatterns) {
      const match = articleContent.match(pattern);
      if (match) {
        if (pattern.source.includes('href="([^"]+)"[^>]*>([^<]+)')) {
          link = match[1];
          title = match[2];
        } else {
          title = match[1];
          link = match[2];
        }
        break;
      }
    }
    
    // Image extraction
    const imagePatterns = [
      /<img[^>]*src="([^"]+)"[^>]*>/i,
      /<img[^>]*data-src="([^"]+)"[^>]*>/i,
      /background-image:\s*url\(['"]([^'"]+)['"]\)/i
    ];
    
    let imageUrl = undefined;
    for (const pattern of imagePatterns) {
      const match = articleContent.match(pattern);
      if (match) {
        imageUrl = match[1].startsWith('http') ? match[1] : `https://the-decoder.de${match[1]}`;
        break;
      }
    }
    
    // Date extraction
    const datePatterns = [
      /<time[^>]*datetime="([^"]+)"[^>]*>/i,
      /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i,
      /<div[^>]*class="[^"]*published[^>]*>([^<]+)<\/div>/i
    ];
    
    let pubDate = null;
    for (const pattern of datePatterns) {
      const match = articleContent.match(pattern);
      if (match) {
        try {
          pubDate = new Date(match[1]).toISOString();
          break;
        } catch {
          // Try next pattern
        }
      }
    }
    
    // Excerpt extraction
    const excerptPatterns = [
      /<p[^>]*class="[^"]*excerpt[^"]*"[^>]*>([^<]+)<\/p>/i,
      /<div[^>]*class="[^"]*summary[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<p[^>]*>([^<]{50,200})<\/p>/i
    ];
    
    let excerpt = null;
    for (const pattern of excerptPatterns) {
      const match = articleContent.match(pattern);
      if (match) {
        excerpt = match[1].trim();
        break;
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
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Generate professional descriptions
  private generateDescription(title: string): string {
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
  
  // Remove duplicate articles by URL
  private removeDuplicatesByUrl(items: RssItem[]): RssItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = item.link.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  private async fallbackToStandardFetch(source: RssSource): Promise<RssItem[]> {
    console.log("Falling back to standard RSS fetch for:", source.name);
    return this.fetchStandardRssFeed(source);
  }
  
  private async fetchStandardRssFeed(source: RssSource): Promise<RssItem[]> {
    let attempts = 0;
    const maxAttempts = this.corsProxies.length * this.maxRetries;
    
    while (attempts < maxAttempts) {
      try {
        const currentProxy = this.getCurrentProxy();
        const encodedRssUrl = encodeURIComponent(source.url);
        const proxyUrl = `${currentProxy}${encodedRssUrl}`;
        
        console.log(`Fetching RSS feed from: ${source.name} (${source.url}) using proxy: ${currentProxy}`);
        
        const response = await fetch(proxyUrl, {
          headers: {
            'Accept': 'application/json, application/xml, text/xml, application/rss+xml, application/atom+xml, */*',
            'User-Agent': 'Mozilla/5.0 (compatible; NewsDigestApp/1.0)'
          },
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
        }
        
        let xmlText;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const jsonResponse = await response.json();
          xmlText = this.extractXmlFromResponse(jsonResponse);
        } else {
          xmlText = await response.text();
        }
        
        if (!xmlText || xmlText.trim().length === 0) {
          throw new Error("Empty RSS feed response");
        }
        
        if (xmlText.toLowerCase().includes('<!doctype html>') || 
            xmlText.toLowerCase().includes('<html') ||
            xmlText.toLowerCase().includes('error ') ||
            xmlText.toLowerCase().includes('access denied')) {
          throw new Error("Received HTML or error page instead of XML feed");
        }
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
          throw new Error("Failed to parse XML: " + parserError.textContent);
        }
        
        const itemElements = xmlDoc.querySelectorAll("item, entry");
        console.log(`Found ${itemElements.length} items in feed ${source.name}`);
        
        if (itemElements.length === 0) {
          const rssElement = xmlDoc.querySelector("rss, feed, rdf\\:RDF");
          if (!rssElement) {
            throw new Error("No RSS structure found in response");
          }
          return [];
        }
        
        const items: RssItem[] = [];
        let successfullyParsed = 0;
        
        itemElements.forEach((item) => {
          try {
            const getElementText = (parent: Element, selectors: string): string => {
              const selectorArray = selectors.split(',').map(s => s.trim());
              
              for (const selector of selectorArray) {
                try {
                  const element = parent.querySelector(selector);
                  if (element && element.textContent) {
                    return element.textContent;
                  }
                } catch (err) {
                  // Ignore selector errors
                }
              }
              return "";
            };
            
            const getContentEncoded = (parent: Element): string => {
              try {
                const contentEncoded = parent.querySelector("content\\:encoded, encoded, content");
                return contentEncoded ? contentEncoded.textContent || "" : "";
              } catch (err) {
                return "";
              }
            };
            
            const getCategories = (parent: Element): string[] => {
              try {
                const categoryElements = parent.querySelectorAll("category");
                const categories: string[] = [];
                categoryElements.forEach((cat) => {
                  if (cat.textContent) categories.push(cat.textContent);
                });
                return categories;
              } catch (err) {
                return [];
              }
            };
            
            const getImageUrl = (parent: Element, content: string): string | undefined => {
              try {
                const mediaContent = parent.querySelector("media\\:content, content");
                if (mediaContent && mediaContent.getAttribute("url")) {
                  return mediaContent.getAttribute("url") || undefined;
                }
                
                const mediaThumbnail = parent.querySelector("media\\:thumbnail");
                if (mediaThumbnail && mediaThumbnail.getAttribute("url")) {
                  return mediaThumbnail.getAttribute("url") || undefined;
                }
                
                const enclosure = parent.querySelector("enclosure");
                if (enclosure && enclosure.getAttribute("url")) {
                  const type = enclosure.getAttribute("type") || "";
                  if (type.startsWith("image/")) {
                    return enclosure.getAttribute("url") || undefined;
                  }
                }
                
                if (content) {
                  const imgRegex = /<img[^>]+src="([^">]+)"/;
                  const match = content.match(imgRegex);
                  return match ? match[1] : undefined;
                }
                
                return undefined;
              } catch (err) {
                return undefined;
              }
            };
            
            const title = getElementText(item, "title, atom:title");
            
            let link = getElementText(item, "link, atom:link");
            if (!link) {
              const linkElement = item.querySelector("link, atom:link");
              if (linkElement && linkElement.getAttribute("href")) {
                link = linkElement.getAttribute("href") || "";
              }
            }
            
            const pubDate = getElementText(item, "pubDate, published, updated, atom:published, atom:updated, dc\\:date");
            const description = getElementText(item, "description, summary, atom:summary");
            const content = getContentEncoded(item) || getElementText(item, "content, atom:content");
            const categories = getCategories(item);
            const creator = getElementText(item, "dc\\:creator, creator, author, atom:author");
            const guid = getElementText(item, "guid, id, atom:id");
            const imageUrl = getImageUrl(item, content);
            
            if (title && (link || guid) && pubDate) {
              items.push({
                title,
                link: link || guid || "",
                pubDate,
                description,
                content,
                categories,
                creator,
                guid,
                imageUrl,
                sourceUrl: source.url,
                sourceName: source.name
              });
              successfullyParsed++;
            }
          } catch (itemError) {
            console.error("Error parsing item:", itemError);
          }
        });
        
        console.log(`Successfully parsed ${successfullyParsed} items from ${source.name}`);
        
        if (items.length === 0) {
          console.warn(`No valid items found in ${source.name}`);
          return [];
        }
        
        return items;
      } catch (error) {
        console.error(`Error fetching RSS source ${source.name} with proxy ${this.getCurrentProxy()}:`, error);
        
        attempts++;
        
        if (attempts % this.maxRetries === 0) {
          this.switchToNextProxy(); 
        }
      }
    }
    
    console.error(`Failed to fetch ${source.name} after trying all proxies`);
    toast.error(`Fehler beim Laden von ${source.name} Feed`);
    return [];
  }
  
  public async fetchRssSource(source: RssSource): Promise<RssItem[]> {
    console.log(`Starting enhanced fetch for source: ${source.name} (${source.url})`);
    
    if (source.url.includes('the-decoder.de')) {
      return this.fetchTheDecoderFeed(source);
    }
    
    return this.fetchStandardRssFeed(source);
  }
}

export default RssFeedService;
