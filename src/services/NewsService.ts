
import { toast } from "sonner";
import DecoderService from "./DecoderService";

// Types for our RSS and news data
export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content: string;
  categories?: string[];
  creator?: string;
  guid?: string;
  imageUrl?: string;
}

export interface WeeklyDigest {
  id: string;
  weekNumber: number;
  year: number;
  dateRange: string;
  title: string;
  summary: string;
  items: RssItem[];
  generatedContent?: string;
  createdAt: Date;
}

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Get the current calendar week
export const getCurrentWeek = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return Math.ceil((dayOfYear + start.getDay()) / 7);
};

// Get the current year
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

// Get the date range for a week number
export const getWeekDateRange = (weekNumber: number, year: number): string => {
  const startDate = getDateOfISOWeek(weekNumber, year);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return `${formatDate(startDate.toISOString())}–${formatDate(endDate.toISOString())}`;
};

// Helper function to get the date of an ISO week
function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getDay();
  const date = simple;
  if (dayOfWeek <= 4) {
    date.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    date.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return date;
}

// Service class for fetching news from RSS feeds
class NewsService {
  private apiKey: string;
  private rssUrl: string = "https://the-decoder.de/feed/";
  private corsProxyUrl: string = "https://corsproxy.io/?";
  private decoderService: DecoderService;
  
  constructor(apiKey?: string) {
    this.decoderService = new DecoderService(apiKey);
    this.apiKey = apiKey || this.decoderService.getRss2JsonApiKey();
  }
  
  // Set the API key
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.decoderService.setApiKey(apiKey);
  }
  
  // Fetch the RSS feed directly using a CORS proxy
  public async fetchNews(): Promise<RssItem[]> {
    try {
      const response = await fetch(`${this.corsProxyUrl}${encodeURIComponent(this.rssUrl)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status}`);
      }
      
      const xmlText = await response.text();
      
      // Instead of using xml2js.parseString, we'll manually parse the RSS feed
      // using DOMParser which is available in the browser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Failed to parse XML: " + parserError.textContent);
      }
      
      const items: RssItem[] = [];
      const itemElements = xmlDoc.querySelectorAll("item");
      
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
        });
      });
      
      if (items.length === 0) {
        console.warn("No items found in RSS feed");
      }
      
      return items;
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
      return [];
    }
  }
  
  // Group news items by week
  public groupNewsByWeek(items: RssItem[]): Record<string, WeeklyDigest> {
    const weeklyDigests: Record<string, WeeklyDigest> = {};
    
    items.forEach(item => {
      const pubDate = new Date(item.pubDate);
      const weekNumber = this.getWeekNumber(pubDate);
      const year = pubDate.getFullYear();
      const weekKey = `${year}-W${weekNumber}`;
      
      if (!weeklyDigests[weekKey]) {
        weeklyDigests[weekKey] = {
          id: weekKey,
          weekNumber,
          year,
          dateRange: getWeekDateRange(weekNumber, year),
          title: `KI-Update KW ${weekNumber} · ${getWeekDateRange(weekNumber, year)}`,
          summary: `Die wichtigsten KI-Nachrichten der Woche ${weekNumber}`,
          items: [],
          createdAt: new Date()
        };
      }
      
      weeklyDigests[weekKey].items.push(item);
    });
    
    // Sort items within each digest by date
    Object.values(weeklyDigests).forEach(digest => {
      digest.items.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
    });
    
    return weeklyDigests;
  }
  
  // Get the week number for a date
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  
  // Generate a newsletter summary from a weekly digest
  public async generateNewsletterSummary(digest: WeeklyDigest): Promise<string> {
    try {
      return await this.decoderService.generateSummary(digest);
    } catch (error) {
      console.error('Error generating newsletter:', error);
      toast.error(`Fehler bei der Generierung des Newsletters: ${(error as Error).message}`);
      return "";
    }
  }
}

export default NewsService;
