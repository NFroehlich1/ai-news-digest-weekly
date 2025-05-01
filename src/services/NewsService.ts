
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
  sourceUrl?: string; // Added to track source
  sourceName?: string; // Added to track source name
}

export interface RssSource {
  url: string;
  name: string;
  enabled: boolean;
  lastFetched?: Date;
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

// Mock data for testing when API fails
const MOCK_NEWS_ITEMS: RssItem[] = [
  {
    title: "Google kündigt Gemini 2.0 an: KI-Modell macht bedeutenden Sprung",
    link: "https://the-decoder.de/google-gemini-2-0-announced/",
    pubDate: new Date().toISOString(),
    description: "Google hat mit Gemini 2.0 ein neues KI-Modell angekündigt, das signifikante Verbesserungen bringt.",
    content: "<p>Google hat mit Gemini 2.0 ein neues KI-Modell angekündigt, das signifikante Verbesserungen bringt.</p>",
    categories: ["Google", "Gemini", "KI-Modelle"],
    creator: "The Decoder Team",
    imageUrl: "https://picsum.photos/800/600"
  },
  {
    title: "OpenAI stellt neuartige Text-zu-Video-KI vor",
    link: "https://the-decoder.de/openai-text-to-video/",
    pubDate: new Date(Date.now() - 86400000).toISOString(), // yesterday
    description: "OpenAI präsentiert eine neue Text-zu-Video-KI, die beeindruckende Ergebnisse liefert.",
    content: "<p>OpenAI präsentiert eine neue Text-zu-Video-KI, die beeindruckende Ergebnisse liefert.</p>",
    categories: ["OpenAI", "Text-zu-Video", "Generative KI"],
    creator: "The Decoder Team",
    imageUrl: "https://picsum.photos/800/600?random=2"
  },
  {
    title: "Meta verbessert seine Übersetzungs-KI für über 100 Sprachen",
    link: "https://the-decoder.de/meta-translation-ai/",
    pubDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    description: "Meta hat seine Übersetzungs-KI um weitere Sprachen erweitert und die Qualität verbessert.",
    content: "<p>Meta hat seine Übersetzungs-KI um weitere Sprachen erweitert und die Qualität verbessert.</p>",
    categories: ["Meta", "Übersetzung", "KI"],
    creator: "The Decoder Team",
    imageUrl: "https://picsum.photos/800/600?random=3"
  },
  {
    title: "Anthropic stellt neue Version von Claude vor",
    link: "https://the-decoder.de/anthropic-claude-new-version/",
    pubDate: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    description: "Anthropic hat eine neue Version seines KI-Assistenten Claude veröffentlicht.",
    content: "<p>Anthropic hat eine neue Version seines KI-Assistenten Claude veröffentlicht.</p>",
    categories: ["Anthropic", "Claude", "KI-Assistenten"],
    creator: "The Decoder Team",
    imageUrl: "https://picsum.photos/800/600?random=4"
  }
];

// Default RSS sources
const DEFAULT_RSS_SOURCES: RssSource[] = [
  {
    url: "https://the-decoder.de/feed/",
    name: "The Decoder",
    enabled: true
  }
];

// Service class for fetching news from RSS feeds
class NewsService {
  private apiKey: string;
  private corsProxyUrl: string = "https://api.allorigins.win/raw?url=";
  private decoderService: DecoderService;
  private useMockData: boolean = false;
  private rssSources: RssSource[] = [];
  
  constructor(apiKey?: string) {
    this.decoderService = new DecoderService(apiKey);
    this.apiKey = apiKey || this.decoderService.getRss2JsonApiKey();
    
    // Load saved RSS sources from localStorage or use defaults
    this.loadRssSources();
  }
  
  // Load RSS sources from localStorage
  private loadRssSources(): void {
    try {
      const savedSources = localStorage.getItem('rss_sources');
      this.rssSources = savedSources ? JSON.parse(savedSources) : [...DEFAULT_RSS_SOURCES];
    } catch (error) {
      console.error("Error loading RSS sources:", error);
      this.rssSources = [...DEFAULT_RSS_SOURCES];
    }
  }
  
  // Save RSS sources to localStorage
  private saveRssSources(): void {
    try {
      localStorage.setItem('rss_sources', JSON.stringify(this.rssSources));
    } catch (error) {
      console.error("Error saving RSS sources:", error);
      toast.error("Fehler beim Speichern der RSS-Quellen");
    }
  }
  
  // Get all RSS sources
  public getRssSources(): RssSource[] {
    return [...this.rssSources];
  }
  
  // Add a new RSS source
  public addRssSource(url: string, name: string): boolean {
    // Basic URL validation
    try {
      new URL(url);
    } catch (error) {
      toast.error("Ungültige URL");
      return false;
    }
    
    // Check if source already exists
    if (this.rssSources.some(source => source.url === url)) {
      toast.error("Diese RSS-Quelle existiert bereits");
      return false;
    }
    
    this.rssSources.push({
      url,
      name: name || new URL(url).hostname,
      enabled: true
    });
    
    this.saveRssSources();
    toast.success(`Neue RSS-Quelle "${name || new URL(url).hostname}" hinzugefügt`);
    return true;
  }
  
  // Remove an RSS source
  public removeRssSource(url: string): boolean {
    const initialLength = this.rssSources.length;
    this.rssSources = this.rssSources.filter(source => source.url !== url);
    
    if (this.rssSources.length < initialLength) {
      this.saveRssSources();
      toast.success("RSS-Quelle entfernt");
      return true;
    }
    
    return false;
  }
  
  // Toggle RSS source enabled/disabled state
  public toggleRssSource(url: string, enabled: boolean): boolean {
    const source = this.rssSources.find(source => source.url === url);
    if (source) {
      source.enabled = enabled;
      this.saveRssSources();
      return true;
    }
    return false;
  }
  
  // Set the API key
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.decoderService.setApiKey(apiKey);
  }
  
  // Enable or disable mock data
  public setUseMockData(useMock: boolean): void {
    this.useMockData = useMock;
  }
  
  // Fetch news from all enabled RSS sources
  public async fetchNews(): Promise<RssItem[]> {
    // If mock data is enabled, return mock items
    if (this.useMockData) {
      console.log("Using mock data instead of fetching from API");
      return Promise.resolve(MOCK_NEWS_ITEMS);
    }
    
    // If no sources are enabled, show a message and return mock data
    const enabledSources = this.rssSources.filter(source => source.enabled);
    if (enabledSources.length === 0) {
      console.log("No enabled RSS sources found, using mock data");
      toast.warning("Keine RSS-Quellen aktiviert");
      return Promise.resolve(MOCK_NEWS_ITEMS);
    }
    
    try {
      // Fetch from all enabled sources
      const allPromises = enabledSources.map(source => this.fetchRssSource(source));
      const results = await Promise.allSettled(allPromises);
      
      // Collect successful results
      const allItems: RssItem[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          // Update last fetched timestamp
          enabledSources[index].lastFetched = new Date();
          allItems.push(...result.value);
        } else if (result.status === 'rejected') {
          console.error(`Error fetching ${enabledSources[index].name}:`, result.reason);
        }
      });
      
      this.saveRssSources(); // Save updated timestamps
      
      if (allItems.length === 0) {
        console.warn("No items found in any RSS feed, using fallback data");
        toast.warning("Keine Artikel in den RSS-Feeds gefunden");
        return MOCK_NEWS_ITEMS;
      }
      
      // Sort all items by date (newest first)
      allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      console.log(`Loaded ${allItems.length} news items from ${enabledSources.length} sources`);
      
      return allItems;
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
      
      // Use mock data as fallback when there's an error
      console.log("Using fallback mock data due to error");
      return MOCK_NEWS_ITEMS;
    }
  }
  
  // Fetch from a specific RSS source
  private async fetchRssSource(source: RssSource): Promise<RssItem[]> {
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
      
      itemElements.forEach((item, index) => {
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
  
  // Filter news to only current week
  public filterCurrentWeekNews(items: RssItem[]): RssItem[] {
    const now = new Date();
    const currentWeek = this.getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    return items.filter(item => {
      const pubDate = new Date(item.pubDate);
      const itemWeek = this.getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      return itemWeek === currentWeek && itemYear === currentYear;
    });
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
  public async generateNewsletterSummary(digest: WeeklyDigest, selectedArticles?: RssItem[]): Promise<string> {
    try {
      return await this.decoderService.generateSummary(digest, selectedArticles);
    } catch (error) {
      console.error('Error generating newsletter:', error);
      toast.error(`Fehler bei der Generierung des Newsletters: ${(error as Error).message}`);
      return "";
    }
  }
}

export default NewsService;
