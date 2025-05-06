import { toast } from "sonner";
import DecoderService from "./DecoderService";
import RssSourceService from "./RssSourceService";
import RssFeedService from "./RssFeedService";
import DigestService from "./DigestService";
import type { RssItem, RssSource, WeeklyDigest } from "../types/newsTypes";
import { MOCK_NEWS_ITEMS } from "../data/mockNews";
import { formatDate, getCurrentWeek, getCurrentYear, getWeekDateRange } from "../utils/dateUtils";

// Re-export types
export type { RssItem, RssSource, WeeklyDigest };
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
  
  // Get the default API key
  public getDefaultApiKey(): string {
    return this.apiKey;
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
          console.log(`Successfully loaded ${result.value.length} items from ${enabledSources[index].name}`);
        } else if (result.status === 'rejected') {
          console.error(`Error fetching ${enabledSources[index].name}:`, result.reason);
          toast.error(`Fehler beim Laden von ${enabledSources[index].name}`);
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
  
  // Get top 10 most important articles for the newsletter
  public prioritizeNewsForNewsletter(items: RssItem[], limit: number = 10): RssItem[] {
    // First, filter out items without titles or descriptions as they're not useful
    const validItems = items.filter(item => item.title && (item.description || item.content));
    
    // Get the current date to calculate recency score
    const now = new Date();
    
    // Score each article based on multiple factors
    const scoredItems = validItems.map(item => {
      let score = 0;
      
      // Score based on recency (newer articles get higher score)
      const pubDate = new Date(item.pubDate);
      const daysDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysDiff); // More recent = higher score
      
      // Score based on content length (more detailed articles get higher score)
      const contentLength = (item.content?.length || 0) + (item.description?.length || 0);
      score += Math.min(5, contentLength / 1000); // Up to 5 points for content
      
      // Score based on having an image (articles with images get a bonus)
      if (item.imageUrl) {
        score += 2;
      }
      
      // Score based on keywords related to AI importance
      const aiKeywords = [
        'künstliche intelligenz', 'ki ', 'ai ', 'machine learning', 'deep learning', 
        'neural network', 'gpt', 'llm', 'openai', 'microsoft', 'google', 'anthropic', 
        'claude', 'gemini', 'mistral', 'meta'
      ];
      
      const combinedText = `${item.title} ${item.description} ${item.content || ''}`.toLowerCase();
      
      aiKeywords.forEach(keyword => {
        if (combinedText.includes(keyword)) {
          score += 1;
        }
      });
      
      return { item, score };
    });
    
    // Sort by score (highest first) and take top 'limit' items
    scoredItems.sort((a, b) => b.score - a.score);
    
    const topItems = scoredItems.slice(0, limit).map(scored => scored.item);
    console.log(`Prioritized ${topItems.length} items out of ${items.length} total items`);
    
    return topItems;
  }
  
  // Fetch metadata for a URL
  public async fetchArticleMetadata(url: string): Promise<Partial<RssItem>> {
    try {
      toast.info("Artikelmetadaten werden abgerufen...");
      
      // Use decoder service to extract metadata from URL
      const metadata = await this.decoderService.extractArticleMetadata(url);
      
      if (!metadata || (!metadata.title && !metadata.description)) {
        toast.warning("Konnte keine Metadaten abrufen, verwende Standardwerte");
        return {
          title: "Artikel ohne Titel",
          description: "Keine Beschreibung verfügbar"
        };
      }
      
      return metadata;
    } catch (error) {
      console.error("Error fetching article metadata:", error);
      toast.error("Fehler beim Abrufen der Metadaten");
      
      return {
        title: "Artikel ohne Titel",
        description: "Keine Beschreibung verfügbar"
      };
    }
  }
  
  // Automatically clean up old articles (more than a week old)
  public cleanupOldArticles(digests: Record<string, WeeklyDigest>): Record<string, WeeklyDigest> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const cleanedDigests = { ...digests };
    
    // For each digest, filter out old articles
    Object.keys(cleanedDigests).forEach(key => {
      const digest = cleanedDigests[key];
      
      // Filter items to keep only those newer than one week
      digest.items = digest.items.filter(item => {
        const pubDate = new Date(item.pubDate);
        return pubDate >= oneWeekAgo;
      });
    });
    
    // Remove empty digests
    Object.keys(cleanedDigests).forEach(key => {
      if (cleanedDigests[key].items.length === 0) {
        delete cleanedDigests[key];
      }
    });
    
    return cleanedDigests;
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
      // If specific articles are selected, use those
      // Otherwise, prioritize the most important articles
      const articlesToUse = selectedArticles || this.prioritizeNewsForNewsletter(digest.items, 10);
      return await this.decoderService.generateSummary(digest, articlesToUse);
    } catch (error) {
      console.error('Error generating newsletter:', error);
      toast.error(`Fehler bei der Generierung des Newsletters: ${(error as Error).message}`);
      return "";
    }
  }
}

export default NewsService;
