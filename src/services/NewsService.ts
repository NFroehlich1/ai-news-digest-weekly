import { toast } from "sonner";
import DecoderService from "./DecoderService";
import RssSourceService from "./RssSourceService";
import RssFeedService from "./RssFeedService";
import DigestService from "./DigestService";
import type { RssItem, RssSource, WeeklyDigest } from "../types/newsTypes";
import { MOCK_NEWS_ITEMS } from "../data/mockNews";
import { formatDate, getCurrentWeek, getCurrentYear, getWeekDateRange } from "../utils/dateUtils";
import { LocalNewsletter } from "../types/newsletterTypes";
import LocalNewsletterService from "./LocalNewsletterService";

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
  private localNewsletterService: LocalNewsletterService;
  private useMockData: boolean = false;
  
  constructor(apiKey?: string) {
    this.rssSourceService = new RssSourceService();
    this.rssFeedService = new RssFeedService();
    this.digestService = new DigestService();
    this.localNewsletterService = new LocalNewsletterService();
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
  
  public getEnabledRssSources(): RssSource[] {
    return this.rssSourceService.getEnabledRssSources();
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
  
  // Fetch news from all enabled RSS sources with comprehensive coverage
  public async fetchNews(): Promise<RssItem[]> {
    // If mock data is enabled, return mock items
    if (this.useMockData) {
      console.log("Using mock data instead of fetching from API");
      return Promise.resolve(MOCK_NEWS_ITEMS);
    }
    
    // Get only enabled sources
    const enabledSources = this.getEnabledRssSources();
    
    // If no sources are enabled, show a message and return mock data
    if (enabledSources.length === 0) {
      console.log("No enabled RSS sources found, using mock data");
      toast.warning("Keine RSS-Quellen aktiviert");
      return Promise.resolve(MOCK_NEWS_ITEMS);
    }
    
    try {
      console.log(`Starting comprehensive news fetch from ${enabledSources.length} enabled sources`);
      
      // Process sources one by one for better error handling
      const allItems: RssItem[] = [];
      let successfulSources = 0;
      
      for (const source of enabledSources) {
        try {
          console.log(`Comprehensive fetch from ${source.name} (${source.url})`);
          const sourceItems = await this.rssFeedService.fetchRssSource(source);
          
          if (sourceItems.length > 0) {
            // Update last fetched timestamp
            source.lastFetched = new Date();
            allItems.push(...sourceItems);
            successfulSources++;
            console.log(`Successfully loaded ${sourceItems.length} items from ${source.name}`);
            
            // Show progress toast for large fetches
            if (sourceItems.length > 20) {
              toast.info(`${sourceItems.length} Artikel von ${source.name} geladen`);
            }
          } else {
            console.warn(`No items found in ${source.name} feed`);
          }
        } catch (sourceError) {
          console.error(`Error fetching ${source.name}:`, sourceError);
          toast.error(`Fehler beim Laden von ${source.name}`);
        }
      }
      
      if (allItems.length === 0) {
        console.warn("No items found in any RSS feed, using fallback data");
        toast.warning("Keine Artikel in den RSS-Feeds gefunden");
        return MOCK_NEWS_ITEMS;
      }
      
      console.log(`Successfully fetched from ${successfulSources} out of ${enabledSources.length} sources`);
      console.log(`Total articles loaded: ${allItems.length}`);
      
      // Sort all items by date (newest first)
      allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      
      // Show success message with comprehensive stats
      const currentWeekItems = this.digestService.filterCurrentWeekNews(allItems);
      toast.success(`${allItems.length} Artikel geladen (${currentWeekItems.length} aus dieser Woche)`);
      
      return allItems;
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
      
      // Use mock data as fallback when there's an error
      console.log("Using fallback mock data due to error");
      return MOCK_NEWS_ITEMS;
    }
  }
  
  // Generate AI summary for a specific article
  public async generateArticleSummary(article: RssItem): Promise<string | null> {
    try {
      return await this.decoderService.generateArticleSummary(article);
    } catch (error) {
      console.error('Error generating article summary:', error);
      toast.error(`Fehler bei der Zusammenfassung des Artikels: ${(error as Error).message}`);
      return null;
    }
  }
  
  // Get top articles for the newsletter with increased limits
  public prioritizeNewsForNewsletter(items: RssItem[], limit: number = 25): RssItem[] { // Increased default from 10 to 25
    console.log(`Prioritizing ${items.length} items for newsletter (limit: ${limit})`);
    
    // First, filter out items without titles or descriptions as they're not useful
    const validItems = items.filter(item => item.title && (item.description || item.content));
    console.log(`Found ${validItems.length} valid items after filtering`);
    
    // Get the current date to calculate recency score
    const now = new Date();
    
    // Score each article based on multiple factors
    const scoredItems = validItems.map(item => {
      let score = 0;
      
      // Score based on recency (newer articles get higher score)
      const pubDate = new Date(item.pubDate);
      const daysDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 15 - daysDiff * 1.5); // Increased base score and slower decay
      score += recencyScore;
      
      // Score based on content length (more detailed articles get higher score)
      const contentLength = (item.content?.length || 0) + (item.description?.length || 0);
      const contentScore = Math.min(8, contentLength / 800); // Increased max score
      score += contentScore;
      
      // Score based on having an image (articles with images get a bonus)
      const imageScore = item.imageUrl ? 5 : 0; // Increased from 3 to 5
      score += imageScore;
      
      // Enhanced scoring based on keywords related to AI importance
      const aiKeywords = [
        'künstliche intelligenz', 'ki ', 'ai ', 'machine learning', 'deep learning', 
        'neural network', 'gpt', 'llm', 'openai', 'microsoft', 'google', 'anthropic', 
        'claude', 'gemini', 'mistral', 'meta', 'chatgpt', 'sora', 'midjourney', 'stable diffusion',
        'kognitive', 'roboter', 'automation', 'algorithmus', 'big data', 'nlp', 'computer vision',
        'maschinelles lernen', 'generative ai', 'generative ki', 'large language model',
        'sprachmodell', 'technologie', 'innovation', 'breakthrough', 'durchbruch'
      ];
      
      const combinedText = `${item.title} ${item.description} ${item.content || ''}`.toLowerCase();
      
      let keywordScore = 0;
      aiKeywords.forEach(keyword => {
        if (combinedText.includes(keyword)) {
          keywordScore += 1.5; // Increased keyword weight
        }
      });
      score += Math.min(12, keywordScore); // Increased cap from 7 to 12
      
      // Give a bonus to certain high-quality sources
      const premiumSources = ['heise.de', 'golem.de', 't3n.de', 'netzpolitik.org', 'thedecoder.de'];
      const sourceScore = premiumSources.some(s => item.sourceUrl?.includes(s)) ? 3 : 0; // Increased from 2 to 3
      score += sourceScore;
      
      // Bonus for articles from The Decoder (our primary source)
      const decoderBonus = item.sourceName === "The Decoder" ? 5 : 0;
      score += decoderBonus;
      
      // Log the scoring details for debugging
      console.log(`Article: "${item.title}" - Score: ${score.toFixed(2)} (recency: ${recencyScore.toFixed(2)}, content: ${contentScore.toFixed(2)}, image: ${imageScore}, keywords: ${keywordScore}, source: ${sourceScore}, decoder: ${decoderBonus})`);
      
      return { item, score };
    });
    
    // Sort by score (highest first) and take top 'limit' items
    scoredItems.sort((a, b) => b.score - a.score);
    
    const topItems = scoredItems.slice(0, limit).map(scored => scored.item);
    console.log(`Prioritized ${topItems.length} items out of ${items.length} total items`);
    
    // Log the selected items with their scores
    topItems.forEach((item, index) => {
      const scoredItem = scoredItems[index];
      console.log(`Top ${index + 1}: "${item.title}" (Score: ${scoredItem.score.toFixed(2)}) from ${item.sourceName || item.sourceUrl}`);
    });
    
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
  
  // Save newsletter to localStorage using LocalNewsletterService
  public async saveNewsletterToLocal(newsletter: LocalNewsletter): Promise<void> {
    return this.localNewsletterService.saveNewsletter(newsletter);
  }
  
  // Get newsletters from localStorage using LocalNewsletterService
  public async getLocalNewsletters(): Promise<LocalNewsletter[]> {
    return this.localNewsletterService.getNewsletters();
  }
  
  // Clear newsletters from localStorage using LocalNewsletterService
  public async clearLocalNewsletters(): Promise<void> {
    return this.localNewsletterService.clearNewsletters();
  }
  
  // Generate demo data for newsletters using LocalNewsletterService
  public async generateDemoNewsletters(): Promise<void> {
    return this.localNewsletterService.generateDemoData();
  }
  
  // Modify the newsletter generation method to save to localStorage instead of Supabase
  public async generateNewsletterSummary(digest: WeeklyDigest, selectedArticles?: RssItem[], linkedInPage?: string): Promise<string> {
    try {
      // If specific articles are selected, use those
      // Otherwise, prioritize the most important articles
      const articlesToUse = selectedArticles || this.prioritizeNewsForNewsletter(digest.items, 25); // Increased default limit
      const summary = await this.decoderService.generateSummary(digest, articlesToUse, linkedInPage);
      
      // Return the generated summary
      return summary;
    } catch (error) {
      console.error('Error generating newsletter:', error);
      toast.error(`Fehler bei der Generierung des Newsletters: ${(error as Error).message}`);
      return "";
    }
  }
}

export default NewsService;
