import { toast } from "sonner";
import DecoderService from "./DecoderService";
import RssSourceService from "./RssSourceService";
import RssFeedService from "./RssFeedService";
import DigestService from "./DigestService";
import NewsletterArchiveService from "./NewsletterArchiveService";
import RawArticleService from "./RawArticleService";
import type { RssItem, RssSource, WeeklyDigest } from "../types/newsTypes";
import { MOCK_NEWS_ITEMS } from "../data/mockNews";
import { formatDate, getCurrentWeek, getCurrentYear, getWeekDateRange } from "../utils/dateUtils";
import { LocalNewsletter } from "../types/newsletterTypes";
import LocalNewsletterService from "./LocalNewsletterService";
import { supabase } from "@/integrations/supabase/client";

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
  private rawArticleService: RawArticleService;
  private useMockData: boolean = false;
  
  constructor() {
    console.log("=== NEWS SERVICE CONSTRUCTOR ===");
    console.log("Using Supabase Edge Function for Gemini API");
    
    this.rssSourceService = new RssSourceService();
    this.rssFeedService = new RssFeedService();
    this.digestService = new DigestService();
    this.localNewsletterService = new LocalNewsletterService();
    this.newsletterArchiveService = new NewsletterArchiveService();
    this.rawArticleService = new RawArticleService();
    
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
  
  // Enhanced fetch news with guaranteed high article count and database storage
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
      
      // Use the enhanced RssFeedService to fetch all sources
      const allItems = await this.rssFeedService.fetchAllSources(enabledSources, true);
      
      if (allItems.length === 0) {
        console.warn("No items found in any RSS feed, using fallback data");
        toast.warning("Keine Artikel in den RSS-Feeds gefunden - verwende Beispieldaten");
        return MOCK_NEWS_ITEMS;
      }
      
      // Save articles to database
      try {
        await this.rawArticleService.saveArticles(allItems);
        console.log(`✅ ${allItems.length} articles saved to database`);
      } catch (saveError) {
        console.error("Error saving articles to database:", saveError);
        toast.warning("Artikel geladen, aber nicht in Datenbank gespeichert");
      }
      
      console.log(`=== FETCH RESULTS ===`);
      console.log(`Total articles: ${allItems.length}`);
      
      // Sort by date (newest first)
      allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      
      console.log(`=== RETURNING ${allItems.length} ARTICLES ===`);
      return allItems;
      
    } catch (error) {
      console.error('Critical error fetching news:', error);
      toast.error(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
      
      console.log("Using fallback mock data due to error");
      return MOCK_NEWS_ITEMS;
    }
  }

  // Get articles from database for current week
  public async getStoredArticlesForCurrentWeek(): Promise<RssItem[]> {
    try {
      console.log("=== FETCHING STORED ARTICLES FOR CURRENT WEEK ===");
      const rawArticles = await this.rawArticleService.getCurrentWeekArticles();
      const rssItems = rawArticles.map(article => this.rawArticleService.convertToRssItem(article));
      
      console.log(`✅ Found ${rssItems.length} stored articles for current week`);
      return rssItems;
    } catch (error) {
      console.error("Error fetching stored articles:", error);
      toast.error("Fehler beim Laden der gespeicherten Artikel");
      return [];
    }
  }

  // Get article statistics
  public async getArticleStats() {
    try {
      return await this.rawArticleService.getArticleStats();
    } catch (error) {
      console.error("Error getting article stats:", error);
      return { total: 0, thisWeek: 0, processed: 0, unprocessed: 0 };
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
      
      // Mark articles as processed if they were successfully used for newsletter generation
      if (summary && articlesToUse.length > 0) {
        try {
          const articleGuids = articlesToUse.map(article => article.guid).filter(Boolean);
          if (articleGuids.length > 0) {
            // Get article IDs from database by their GUIDs
            const { data: rawArticles } = await supabase
              .from('daily_raw_articles')
              .select('id')
              .in('guid', articleGuids);
            
            if (rawArticles && rawArticles.length > 0) {
              const articleIds = rawArticles.map(article => article.id);
              await this.rawArticleService.markArticlesAsProcessed(articleIds);
              console.log(`✅ Marked ${articleIds.length} articles as processed`);
            }
          }
        } catch (markError) {
          console.error("Error marking articles as processed:", markError);
          // Don't throw error, just log it
        }
      }
      
      // Return the enhanced summary
      return summary;
    } catch (error) {
      console.error('Error generating enhanced newsletter via Supabase:', error);
      toast.error(`Fehler bei der Generierung des ausführlichen Newsletters: ${(error as Error).message}`);
      return "";
    }
  }

  // New method: Trigger automatic newsletter generation
  public async triggerAutomaticGeneration(): Promise<{ success: boolean; message: string; data?: any }> {
    console.log("=== TRIGGERING AUTOMATIC NEWSLETTER GENERATION ===");
    
    try {
      const { data, error } = await supabase.functions.invoke('auto-generate-newsletter', {
        body: { trigger: 'manual' }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast.success(data.message);
        return { success: true, message: data.message, data };
      } else {
        toast.error(data.error || "Unbekannter Fehler");
        return { success: false, message: data.error || "Unbekannter Fehler" };
      }
    } catch (error) {
      console.error('Error triggering automatic generation:', error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(`Fehler bei der automatischen Generierung: ${errorMessage}`);
      return { success: false, message: errorMessage };
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

  // Raw article service methods
  public getRawArticleService(): RawArticleService {
    return this.rawArticleService;
  }
}

export default NewsService;
