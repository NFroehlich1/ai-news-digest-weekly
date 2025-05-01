
import { RssItem, RssSource } from '../types/newsTypes';
import { toast } from "sonner";

/**
 * Service for fetching and parsing RSS feeds
 */
class RssFeedService {
  private corsProxyUrl: string = "https://api.allorigins.win/raw?url=";
  
  constructor() {}
  
  // Fetch from a specific RSS source
  public async fetchRssSource(source: RssSource): Promise<RssItem[]> {
    try {
      const encodedRssUrl = encodeURIComponent(source.url);
      const proxyUrl = `${this.corsProxyUrl}${encodedRssUrl}`;
      
      console.log(`Fetching RSS feed from: ${source.name} (${source.url})`);
      
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
      
      const items: RssItem[] = [];
      const itemElements = xmlDoc.querySelectorAll("item");
      console.log(`Found ${itemElements.length} items in feed ${source.name}`);
      
      if (itemElements.length === 0) {
        return [];
      }
      
      itemElements.forEach((item) => {
        // Helper function to safely get text content from an element
        const getElementText = (parent: Element, tagName: string): string => {
          const element = parent.querySelector(tagName);
          return element ? element.textContent || "" : "";
        };
        
        // Extract CDATA content from content:encoded
        const getContentEncoded = (parent: Element): string => {
          const contentEncoded = parent.querySelector("content\\:encoded, encoded");
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
        
        const title = getElementText(item, "title");
        const link = getElementText(item, "link");
        const pubDate = getElementText(item, "pubDate");
        const description = getElementText(item, "description");
        const content = getContentEncoded(item);
        const categories = getCategories(item);
        const creator = getElementText(item, "dc\\:creator, creator");
        const guid = getElementText(item, "guid");
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
      console.error(`Error fetching RSS source ${source.name}:`, error);
      return [];
    }
  }
}

export default RssFeedService;
