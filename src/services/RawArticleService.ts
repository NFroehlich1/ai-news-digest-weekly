
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RssItem } from "../types/newsTypes";

export interface RawArticle {
  id?: string;
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  source_url?: string;
  source_name?: string;
  description?: string;
  content?: string;
  categories?: string[];
  creator?: string;
  image_url?: string;
  fetched_at?: string;
  processed?: boolean;
  created_at?: string;
  updated_at?: string;
}

class RawArticleService {
  
  // Save articles to the database
  public async saveArticles(articles: RssItem[]): Promise<void> {
    console.log(`=== SAVING ${articles.length} ARTICLES TO DATABASE ===`);
    
    try {
      const rawArticles: Omit<RawArticle, 'id' | 'created_at' | 'updated_at'>[] = articles.map(article => ({
        title: article.title,
        link: article.link,
        guid: article.guid || article.link, // Use link as fallback for guid
        pubDate: article.pubDate,
        source_url: article.link,
        source_name: article.sourceName,
        description: article.description,
        content: article.content,
        categories: Array.isArray(article.categories) ? article.categories : [],
        creator: article.creator,
        image_url: article.imageUrl,
        fetched_at: new Date().toISOString(),
        processed: false
      }));

      // Insert articles with conflict handling (ignore duplicates)
      const { data, error } = await supabase
        .from('daily_raw_articles')
        .upsert(rawArticles, { 
          onConflict: 'guid',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('Error saving articles:', error);
        throw new Error(`Fehler beim Speichern der Artikel: ${error.message}`);
      }

      console.log(`✅ Articles saved successfully to database`);
      
    } catch (error) {
      console.error('Error in saveArticles:', error);
      throw error;
    }
  }

  // Get articles from database by date range
  public async getArticlesByDateRange(startDate: string, endDate: string): Promise<RawArticle[]> {
    console.log(`=== FETCHING ARTICLES FROM ${startDate} TO ${endDate} ===`);
    
    try {
      const { data, error } = await supabase
        .from('daily_raw_articles')
        .select('*')
        .gte('pubDate', startDate)
        .lte('pubDate', endDate)
        .order('pubDate', { ascending: false });

      if (error) {
        console.error('Error fetching articles:', error);
        throw new Error(`Fehler beim Laden der Artikel: ${error.message}`);
      }

      console.log(`✅ Found ${data?.length || 0} articles in date range`);
      return data || [];
      
    } catch (error) {
      console.error('Error in getArticlesByDateRange:', error);
      throw error;
    }
  }

  // Get articles for current week
  public async getCurrentWeekArticles(): Promise<RawArticle[]> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    return this.getArticlesByDateRange(
      startOfWeek.toISOString(),
      endOfWeek.toISOString()
    );
  }

  // Mark articles as processed
  public async markArticlesAsProcessed(articleIds: string[]): Promise<void> {
    console.log(`=== MARKING ${articleIds.length} ARTICLES AS PROCESSED ===`);
    
    try {
      const { error } = await supabase
        .from('daily_raw_articles')
        .update({ processed: true })
        .in('id', articleIds);

      if (error) {
        console.error('Error marking articles as processed:', error);
        throw new Error(`Fehler beim Markieren der Artikel: ${error.message}`);
      }

      console.log(`✅ Marked articles as processed`);
      
    } catch (error) {
      console.error('Error in markArticlesAsProcessed:', error);
      throw error;
    }
  }

  // Get article statistics
  public async getArticleStats(): Promise<{
    total: number;
    thisWeek: number;
    processed: number;
    unprocessed: number;
  }> {
    try {
      // Get total count
      const { count: total } = await supabase
        .from('daily_raw_articles')
        .select('*', { count: 'exact', head: true });

      // Get this week's count
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      const { count: thisWeek } = await supabase
        .from('daily_raw_articles')
        .select('*', { count: 'exact', head: true })
        .gte('pubDate', startOfWeek.toISOString());

      // Get processed count
      const { count: processed } = await supabase
        .from('daily_raw_articles')
        .select('*', { count: 'exact', head: true })
        .eq('processed', true);

      // Get unprocessed count
      const { count: unprocessed } = await supabase
        .from('daily_raw_articles')
        .select('*', { count: 'exact', head: true })
        .eq('processed', false);

      return {
        total: total || 0,
        thisWeek: thisWeek || 0,
        processed: processed || 0,
        unprocessed: unprocessed || 0
      };
      
    } catch (error) {
      console.error('Error getting article stats:', error);
      return { total: 0, thisWeek: 0, processed: 0, unprocessed: 0 };
    }
  }

  // Convert RawArticle to RssItem format
  public convertToRssItem(rawArticle: RawArticle): RssItem {
    return {
      title: rawArticle.title || "Untitled",
      link: rawArticle.link || "",
      guid: rawArticle.guid || rawArticle.link || "",
      pubDate: rawArticle.pubDate || new Date().toISOString(),
      sourceName: rawArticle.source_name || "Unknown Source",
      description: rawArticle.description,
      content: rawArticle.content,
      categories: rawArticle.categories || [],
      creator: rawArticle.creator,
      imageUrl: rawArticle.image_url
    };
  }

  // Convert RssItem array to RawArticle array
  public convertToRawArticles(rssItems: RssItem[]): RawArticle[] {
    return rssItems.map(item => ({
      title: item.title,
      link: item.link,
      guid: item.guid || item.link,
      pubDate: item.pubDate,
      source_url: item.link,
      source_name: item.sourceName,
      description: item.description,
      content: item.content,
      categories: Array.isArray(item.categories) ? item.categories : [],
      creator: item.creator,
      image_url: item.imageUrl,
      fetched_at: new Date().toISOString(),
      processed: false
    }));
  }
}

export default RawArticleService;
