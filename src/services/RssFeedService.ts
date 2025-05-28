
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RssItem, RssSource } from "../types/newsTypes";

class RssFeedService {
  
  // Enhanced RSS fetching using Supabase Edge Function
  public async fetchRssSource(source: RssSource): Promise<RssItem[]> {
    console.log(`=== FETCHING RSS SOURCE: ${source.name} ===`);
    console.log(`URL: ${source.url}`);
    
    try {
      // Use Supabase Edge Function to fetch RSS content
      const { data, error } = await supabase.functions.invoke('fetch-rss', {
        body: { 
          url: source.url,
          source_name: source.name
        }
      });

      if (error) {
        console.error(`❌ Edge Function error for ${source.name}:`, error);
        throw new Error(`Edge Function Fehler: ${error.message}`);
      }

      if (!data.success) {
        console.error(`❌ RSS fetch failed for ${source.name}:`, data.error);
        throw new Error(data.error || 'Unbekannter Fehler beim RSS-Abruf');
      }

      const articles = data.articles || [];
      console.log(`✅ ${source.name}: ${articles.length} articles fetched successfully`);
      
      // Filter and validate articles
      const validArticles = articles.filter((article: any) => {
        return article.title && article.link && article.pubDate;
      });

      console.log(`✅ ${source.name}: ${validArticles.length} valid articles after filtering`);
      return validArticles;

    } catch (error) {
      console.error(`❌ Error fetching ${source.name}:`, error);
      
      // Don't toast individual source errors, let the caller handle it
      throw new Error(`Fehler beim Abrufen von ${source.name}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  // Fallback method using RSS2JSON API (kept as backup)
  public async fetchRssSourceFallback(source: RssSource, apiKey: string): Promise<RssItem[]> {
    console.log(`=== FALLBACK: Fetching RSS using RSS2JSON API ===`);
    console.log(`URL: ${source.url}`);
    
    try {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}&api_key=${apiKey}&count=50`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`RSS2JSON API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error(`RSS2JSON error: ${data.message || 'Unknown error'}`);
      }
      
      const items: RssItem[] = (data.items || []).map((item: any) => ({
        title: item.title || "Untitled",
        link: item.link || "",
        guid: item.guid || item.link || "",
        pubDate: item.pubDate || new Date().toISOString(),
        sourceName: source.name,
        description: item.description || null,
        content: item.content || null,
        categories: Array.isArray(item.categories) ? item.categories : [],
        creator: item.author || null,
        imageUrl: item.thumbnail || item.enclosure?.link || null
      }));
      
      console.log(`✅ RSS2JSON fallback: ${items.length} items from ${source.name}`);
      return items;
      
    } catch (error) {
      console.error(`❌ RSS2JSON fallback error for ${source.name}:`, error);
      throw error;
    }
  }

  // Enhanced collection method with better error handling
  public async fetchAllSources(sources: RssSource[], useEdgeFunction: boolean = true): Promise<RssItem[]> {
    console.log(`=== FETCHING ALL RSS SOURCES (${sources.length} sources) ===`);
    
    if (sources.length === 0) {
      console.warn("No RSS sources provided");
      return [];
    }

    const allItems: RssItem[] = [];
    let successfulSources = 0;
    let errors: string[] = [];

    // Process sources sequentially to avoid overwhelming servers
    for (const source of sources) {
      try {
        let items: RssItem[] = [];
        
        if (useEdgeFunction) {
          try {
            items = await this.fetchRssSource(source);
          } catch (edgeError) {
            console.warn(`Edge function failed for ${source.name}, trying fallback...`);
            
            // Try fallback with a default API key
            const fallbackApiKey = "4aslwlcwucxcdgqjglhcv7jgpwoxq4yso"; // RSS2JSON free tier
            items = await this.fetchRssSourceFallback(source, fallbackApiKey);
          }
        } else {
          const fallbackApiKey = "4aslwlcwucxcdgqjglhcv7jgpwoxq4yso";
          items = await this.fetchRssSourceFallback(source, fallbackApiKey);
        }

        if (items.length > 0) {
          allItems.push(...items);
          successfulSources++;
          console.log(`✅ ${source.name}: ${items.length} articles added`);
        } else {
          console.warn(`⚠️ ${source.name}: No articles found`);
          errors.push(`${source.name}: Keine Artikel gefunden`);
        }

      } catch (error) {
        console.error(`❌ Failed to fetch ${source.name}:`, error);
        errors.push(`${source.name}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    }

    console.log(`=== COLLECTION COMPLETE ===`);
    console.log(`Successful sources: ${successfulSources}/${sources.length}`);
    console.log(`Total articles: ${allItems.length}`);
    
    if (errors.length > 0) {
      console.warn(`Errors encountered:`, errors);
    }

    if (allItems.length === 0 && errors.length > 0) {
      // Show user-friendly error message
      const errorSummary = errors.length > 3 ? 
        `${errors.slice(0, 2).join(', ')} und ${errors.length - 2} weitere Quellen` :
        errors.join(', ');
      
      toast.warning(`Probleme beim Abrufen: ${errorSummary}`);
    } else if (successfulSources > 0) {
      toast.success(`${allItems.length} Artikel von ${successfulSources} Quellen geladen`);
    }

    return allItems;
  }
}

export default RssFeedService;
