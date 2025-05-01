
import { toast } from "sonner";
import DecoderService from "./DecoderService";
import RssSourceService from "./RssSourceService";
import RssFeedService from "./RssFeedService";
import DigestService from "./DigestService";
import { RssItem, RssSource, WeeklyDigest } from "../types/newsTypes";
import { MOCK_NEWS_ITEMS } from "../data/mockNews";
import { formatDate, getCurrentWeek, getCurrentYear, getWeekDateRange } from "../utils/dateUtils";

// Re-export types
export { RssItem, RssSource, WeeklyDigest };
export { formatDate, getCurrentWeek, getCurrentYear, getWeekDateRange };

// Main service class for fetching news from RSS feeds
class NewsService {
  private apiKey: string;
  private decoderService: DecoderService;
  private rssSourceService: RssSourceService;
  private rssFeedService: RssFeedService;
  private digestService: DigestService;
  private useMockData: boolean = false;
  
  constructor(apiKey?: string) {
    this.rssSourceService = new RssSourceService();
    this.rssFeedService = new RssFeedService();
    this.digestService = new DigestService();
    this.decoderService = new DecoderService(apiKey);
    this.apiKey = apiKey || this.decoderService.getRss2JsonApiKey();
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
  
  // RSS Source methods (delegated to RssSourceService)
  public getRssSources(): RssSource[] {
    return this.rssSourceService.getRssSources();
  }
  
  public addRssSource(url: string, name: string): boolean {
    return this.rssSourceService.addRssSource(url, name);
  }
  
  public removeRssSource(url: string): boolean {
    return this.rssSourceService.removeRssSource(url);
  }
  
  public toggleRssSource(url: string, enabled: boolean): boolean {
    return this.rssSourceService.toggleRssSource(url, enabled);
  }
  
  // Fetch news from all enabled RSS sources
  public async fetchNews(): Promise<RssItem[]> {
    // If mock data is enabled, return mock items
    if (this.useMockData) {
      console.log("Using mock data instead of fetching from API");
      return Promise.resolve(MOCK_NEWS_ITEMS);
    }
    
    // If no sources are enabled, show a message and return mock data
    const enabledSources = this.getRssSources().filter(source => source.enabled);
    if (enabledSources.length === 0) {
      console.log("No enabled RSS sources found, using mock data");
      toast.warning("Keine RSS-Quellen aktiviert");
      return Promise.resolve(MOCK_NEWS_ITEMS);
    }
    
    try {
      // Fetch from all enabled sources
      const allPromises = enabledSources.map(source => this.rssFeedService.fetchRssSource(source));
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
  
  // Digest methods (delegated to DigestService)
  public filterCurrentWeekNews(items: RssItem[]): RssItem[] {
    return this.digestService.filterCurrentWeekNews(items);
  }
  
  public groupNewsByWeek(items: RssItem[]): Record<string, WeeklyDigest> {
    return this.digestService.groupNewsByWeek(items);
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
