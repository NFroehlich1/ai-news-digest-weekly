import { toast } from "sonner";
import DecoderService from "./DecoderService";
import RssSourceService from "./RssSourceService";
import RssFeedService from "./RssFeedService";
import DigestService from "./DigestService";
import NewsletterArchiveService from "./NewsletterArchiveService";
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
  private decoderService: DecoderService;
  private rssSourceService: RssSourceService;
  private rssFeedService: RssFeedService;
  private digestService: DigestService;
  private localNewsletterService: LocalNewsletterService;
  private newsletterArchiveService: NewsletterArchiveService;
  private useMockData: boolean = false;
  
  constructor() {
    console.log("=== NEWS SERVICE CONSTRUCTOR ===");
    console.log("Using Supabase Edge Function for Gemini API");
    
    this.rssSourceService = new RssSourceService();
    this.rssFeedService = new RssFeedService();
    this.digestService = new DigestService();
    this.localNewsletterService = new LocalNewsletterService();
    this.newsletterArchiveService = new NewsletterArchiveService();
    
    // Create DecoderService without API key (uses Supabase)
    this.decoderService = new DecoderService();
    
    console.log("DecoderService created using Supabase Edge Function");
  }
  
  // Set the API key (now ignored, kept for compatibility)
  public setApiKey(apiKey: string): void {
    console.log("=== API KEY SETTING IGNORED ===");
    console.log("Using Supabase Edge Function instead of direct API key");
  }
  
  // Get the default API key (returns RSS2JSON key for RSS feeds)
  public getDefaultApiKey(): string {
    return this.decoderService.getRss2JsonApiKey();
  }
  
  // Get the Gemini API key (now returns info message)
  public getGeminiApiKey(): string {
    return "Stored securely in Supabase";
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
  
  // Enhanced fetch news with guaranteed high article count
  public async fetchNews(): Promise<RssItem[]> {
    if (this.useMockData) {
      console.log("Using mock data instead of fetching from API");
      return Promise.resolve(MOCK_NEWS_ITEMS);
    }
    
    const enabledSources = this.getEnabledRssSources();
    
    if (enabledSources.length === 0) {
      console.log("No enabled RSS sources found, using mock data");
      toast.warning("Keine RSS-Quellen aktiviert");
      return Promise.resolve(MOCK_NEWS_ITEMS);
    }
    
    try {
      console.log(`=== NEWS FETCH START ===`);
      console.log(`Enabled sources: ${enabledSources.length}`);
      
      const allItems: RssItem[] = [];
      let successfulSources = 0;
      
      // Process sources sequentially for better reliability
      for (const source of enabledSources) {
        try {
          console.log(`Fetching from ${source.name}...`);
          const sourceItems = await this.rssFeedService.fetchRssSource(source);
          
          if (sourceItems.length > 0) {
            source.lastFetched = new Date();
            allItems.push(...sourceItems);
            successfulSources++;
            console.log(`✅ ${source.name}: ${sourceItems.length} articles loaded`);
          } else {
            console.warn(`❌ ${source.name}: No articles found`);
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
      
      console.log(`=== FETCH RESULTS ===`);
      console.log(`Successful sources: ${successfulSources}/${enabledSources.length}`);
      console.log(`Total articles: ${allItems.length}`);
      
      // Sort by date (newest first)
      allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      
      toast.success(`${allItems.length} Artikel erfolgreich geladen`);
      
      console.log(`=== RETURNING ${allItems.length} ARTICLES ===`);
      return allItems;
      
    } catch (error) {
      console.error('Critical error fetching news:', error);
      toast.error(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
      
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

  // Enhanced newsletter generation method - uses Supabase Edge Function
  public async generateNewsletterSummary(digest: WeeklyDigest, selectedArticles?: RssItem[], linkedInPage?: string): Promise<string> {
    console.log("=== NEWS SERVICE: GENERATE NEWSLETTER SUMMARY VIA SUPABASE ===");
    
    try {
      // Use selected articles or all available articles
      const articlesToUse = selectedArticles || digest.items;
      
      console.log("Generating enhanced newsletter summary via Supabase...");
      const summary = await this.decoderService.generateSummary(digest, articlesToUse, linkedInPage);
      
      // Return the enhanced summary
      return summary;
    } catch (error) {
      console.error('Error generating enhanced newsletter via Supabase:', error);
      toast.error(`Fehler bei der Generierung des ausführlichen Newsletters: ${(error as Error).message}`);
      return "";
    }
  }

  // Newsletter archive methods
  public async saveNewsletterToArchive(digest: WeeklyDigest, content: string, htmlContent?: string) {
    return this.newsletterArchiveService.saveNewsletter(digest, content, htmlContent);
  }

  public async getNewsletterArchive() {
    return this.newsletterArchiveService.getNewsletters();
  }

  public async getNewsletterByWeek(weekNumber: number, year: number) {
    return this.newsletterArchiveService.getNewsletterByWeek(weekNumber, year);
  }

  public async deleteArchivedNewsletter(id: string) {
    return this.newsletterArchiveService.deleteNewsletter(id);
  }
}

export default NewsService;
