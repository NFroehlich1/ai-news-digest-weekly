
import { RssItem, RssSource } from '../types/newsTypes';
import { toast } from "sonner";

/**
 * Service for fetching and parsing RSS feeds
 */
class RssFeedService {
  // Use a more reliable CORS proxy with fallbacks
  private corsProxies: string[] = [
    "https://api.allorigins.win/raw?url=",
    "https://corsproxy.io/?",
    "https://cors-anywhere.herokuapp.com/"
  ];
  
  private currentProxyIndex: number = 0;
  
  constructor() {}
  
  private getCurrentProxy(): string {
    return this.corsProxies[this.currentProxyIndex];
  }
  
  private switchToNextProxy(): string {
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
    console.log(`Switching to proxy: ${this.getCurrentProxy()}`);
    return this.getCurrentProxy();
  }
  
  // Fetch from a specific RSS source
  public async fetchRssSource(source: RssSource): Promise<RssItem[]> {
    let attempts = 0;
    const maxAttempts = this.corsProxies.length;
    
    while (attempts < maxAttempts) {
      try {
        const currentProxy = this.getCurrentProxy();
        const encodedRssUrl = encodeURIComponent(source.url);
        const proxyUrl = `${currentProxy}${encodedRssUrl}`;
        
        console.log(`Fetching RSS feed from: ${source.name} (${source.url}) using proxy: ${currentProxy}`);
        
        const response = await fetch(proxyUrl, {
          headers: {
            'Accept': 'application/xml, text/xml, */*',
            'User-Agent': 'Mozilla/5.0 (compatible; NewsDigestApp/1.0)'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
        }
        
        const xmlText = await response.text();
        
        if (!xmlText || xmlText.trim().length === 0) {
          throw new Error("Empty RSS feed response");
        }
        
        // Check if we got HTML instead of XML
        if (xmlText.toLowerCase().includes('<!doctype html>')) {
          throw new Error("Received HTML instead of XML feed");
        }
        
        // Parse the RSS feed using DOMParser
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
          throw new Error("Failed to parse XML: " + parserError.textContent);
        }
        
        // Try to get items from either item tags or entry tags (for Atom feeds)
        const itemElements = xmlDoc.querySelectorAll("item, entry");
        console.log(`Found ${itemElements.length} items in feed ${source.name}`);
        
        if (itemElements.length === 0) {
          return [];
        }
        
        const items: RssItem[] = [];
        
        itemElements.forEach((item) => {
          // Helper function to safely get text content from an element
          const getElementText = (parent: Element, selectors: string): string => {
            // Split multiple possible selectors
            const selectorArray = selectors.split(',').map(s => s.trim());
            
            for (const selector of selectorArray) {
              const element = parent.querySelector(selector);
              if (element && element.textContent) {
                return element.textContent;
              }
            }
            return "";
          };
          
          // Extract CDATA content from content:encoded
          const getContentEncoded = (parent: Element): string => {
            const contentEncoded = parent.querySelector("content\\:encoded, encoded, content");
            return contentEncoded ? contentEncoded.textContent || "" : "";
          };
          
          // Extract categories
          const getCategories = (parent: Element): string[] => {
            const categoryElements = parent.querySelectorAll("category");
            const categories: string[] = [];
            categoryElements.forEach((cat) => {
              if (cat.textContent) categories.push(cat.textContent);
            });
            return categories;
          };
          
          // Extract image URL from content or media:content
          const getImageUrl = (parent: Element, content: string): string | undefined => {
            // Try media:content first
            const mediaContent = parent.querySelector("media\\:content, content");
            if (mediaContent && mediaContent.getAttribute("url")) {
              return mediaContent.getAttribute("url") || undefined;
            }
            
            // Try enclosure
            const enclosure = parent.querySelector("enclosure");
            if (enclosure && enclosure.getAttribute("url")) {
              return enclosure.getAttribute("url") || undefined;
            }
            
            // Extract from content if available
            if (content) {
              const imgRegex = /<img[^>]+src="([^">]+)"/;
              const match = content.match(imgRegex);
              return match ? match[1] : undefined;
            }
            
            return undefined;
          };
          
          // Get title from either title or atom:title
          const title = getElementText(item, "title, atom:title");
          
          // Get link from either link or atom:link
          let link = getElementText(item, "link, atom:link");
          if (!link) {
            const linkElement = item.querySelector("link, atom:link");
            if (linkElement && linkElement.getAttribute("href")) {
              link = linkElement.getAttribute("href") || "";
            }
          }
          
          // Get publication date from either pubDate or published or updated
          const pubDate = getElementText(item, "pubDate, published, updated, atom:published, atom:updated");
          
          const description = getElementText(item, "description, summary, atom:summary");
          const content = getContentEncoded(item) || getElementText(item, "content, atom:content");
          const categories = getCategories(item);
          const creator = getElementText(item, "dc\\:creator, creator, author, atom:author");
          const guid = getElementText(item, "guid, id, atom:id");
          const imageUrl = getImageUrl(item, content);
          
          items.push({
            title,
            link,
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
        });
        
        return items;
      } catch (error) {
        console.error(`Error fetching RSS source ${source.name} with proxy ${this.getCurrentProxy()}:`, error);
        attempts++;
        this.switchToNextProxy(); // Try with next proxy
      }
    }
    
    console.error(`Failed to fetch ${source.name} after trying all proxies`);
    return [];
  }
}

export default RssFeedService;
