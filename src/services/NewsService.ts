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
      console.log(`=== ENHANCED NEWS FETCH START ===`);
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
            
            // Show progress for large loads
            if (sourceItems.length > 15) {
              toast.info(`${sourceItems.length} Artikel von ${source.name} geladen`);
            }
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
      
      // Enhanced success message
      toast.success(`${allItems.length} Artikel erfolgreich geladen für umfassende Wochenabdeckung`);
      
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
  
  // Significantly enhanced article prioritization for comprehensive coverage
  public prioritizeNewsForNewsletter(items: RssItem[], limit: number = 50): RssItem[] {
    console.log(`=== ENHANCED PRIORITIZATION ===`);
    console.log(`Input: ${items.length} items, Target: ${limit} items`);
    
    // Filter valid items
    const validItems = items.filter(item => item.title && (item.description || item.content));
    console.log(`Valid items after filtering: ${validItems.length}`);
    
    const now = new Date();
    
    // Enhanced scoring algorithm
    const scoredItems = validItems.map(item => {
      let score = 0;
      
      // Recency score (0-25 points)
      const pubDate = new Date(item.pubDate);
      const daysDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 25 - daysDiff * 1.5);
      score += recencyScore;
      
      // Content length score (0-15 points)
      const contentLength = (item.content?.length || 0) + (item.description?.length || 0);
      const contentScore = Math.min(15, contentLength / 400);
      score += contentScore;
      
      // Image bonus (8 points)
      const imageScore = item.imageUrl ? 8 : 0;
      score += imageScore;
      
      // AI/Tech keyword scoring (0-20 points)
      const aiKeywords = [
        'künstliche intelligenz', 'ki ', 'ai ', 'machine learning', 'deep learning', 
        'neural network', 'gpt', 'llm', 'openai', 'microsoft', 'google', 'anthropic', 
        'claude', 'gemini', 'mistral', 'meta', 'chatgpt', 'sora', 'midjourney',
        'roboter', 'automation', 'algorithmus', 'big data', 'nlp', 'computer vision',
        'generative ai', 'sprachmodell', 'technologie', 'innovation', 'breakthrough',
        'transformer', 'dataset', 'training', 'multimodal'
      ];
      
      const combinedText = `${item.title} ${item.description} ${item.content || ''}`.toLowerCase();
      
      let keywordScore = 0;
      aiKeywords.forEach(keyword => {
        if (combinedText.includes(keyword)) {
          keywordScore += 2.5; // Increased weight
        }
      });
      score += Math.min(20, keywordScore);
      
      // Source quality bonus (0-8 points)
      const premiumSources = ['heise.de', 'golem.de', 't3n.de', 'netzpolitik.org', 'thedecoder.de'];
      const sourceScore = premiumSources.some(s => item.sourceUrl?.includes(s)) ? 5 : 0;
      score += sourceScore;
      
      // The Decoder strong bonus (10 points)
      const decoderBonus = item.sourceName === "The Decoder" ? 10 : 0;
      score += decoderBonus;
      
      console.log(`"${item.title.substring(0, 60)}..." - Score: ${score.toFixed(1)} (recency: ${recencyScore.toFixed(1)}, content: ${contentScore.toFixed(1)}, keywords: ${keywordScore.toFixed(1)}, source: ${sourceScore}, decoder: ${decoderBonus})`);
      
      return { item, score };
    });
    
    // Sort by score and take top items
    scoredItems.sort((a, b) => b.score - a.score);
    
    const topItems = scoredItems.slice(0, limit).map(scored => scored.item);
    
    console.log(`=== PRIORITIZATION COMPLETE ===`);
    console.log(`Selected ${topItems.length} out of ${items.length} items`);
    console.log(`Top 5 scores: ${scoredItems.slice(0, 5).map(s => s.score.toFixed(1)).join(', ')}`);
    
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
  
  // Enhanced newsletter generation method with more content focus
  public async generateNewsletterSummary(digest: WeeklyDigest, selectedArticles?: RssItem[], linkedInPage?: string): Promise<string> {
    try {
      // If specific articles are selected, use those
      // Otherwise, prioritize the most important articles with increased limit
      const articlesToUse = selectedArticles || this.prioritizeNewsForNewsletter(digest.items, 50);
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
