
import { RssItem, WeeklyDigest } from "@/types/newsTypes";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

class DecoderService {
  private rss2JsonApiKey: string = "4aslwlcwucxcdgqjglhcv7jgpwoxq4yso";

  constructor() {
    console.log("DecoderService created - using Supabase Edge Function for Gemini API");
  }

  public setApiKey(apiKey: string): void {
    console.log("DecoderService: API key setting ignored - using Supabase secrets");
  }

  public getRss2JsonApiKey(): string {
    return this.rss2JsonApiKey;
  }

  // Verify API key method using Edge Function
  public async verifyApiKey(): Promise<{ isValid: boolean; message: string }> {
    console.log("=== VERIFYING GEMINI API KEY VIA SUPABASE ===");

    try {
      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: { action: 'verify-key' }
      });

      if (error) {
        console.error("❌ Supabase function error:", error);
        return { isValid: false, message: `Supabase Fehler: ${error.message}` };
      }

      console.log("✅ Gemini API key verification via Supabase successful");
      return data;

    } catch (error) {
      console.error("❌ Gemini API verification error:", error);
      return { isValid: false, message: `Verbindungsfehler: ${(error as Error).message}` };
    }
  }

  // Enhanced newsletter generation using Edge Function
  public async generateSummary(digest: WeeklyDigest, selectedArticles?: RssItem[], linkedInPage?: string): Promise<string> {
    console.log("=== DECODER SERVICE GENERATE SUMMARY VIA SUPABASE ===");
    
    const articlesToUse = selectedArticles || digest.items;
    
    if (articlesToUse.length === 0) {
      throw new Error("Keine Artikel für die Zusammenfassung verfügbar");
    }

    console.log(`Generating detailed summary for ${articlesToUse.length} articles via Supabase`);

    try {
      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: { 
          action: 'generate-summary',
          data: {
            digest,
            selectedArticles: articlesToUse,
            linkedInPage
          }
        }
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw new Error(`Supabase Fehler: ${error.message}`);
      }

      if (data.error) {
        console.error("Gemini API Error:", data.error);
        throw new Error(data.error);
      }

      if (!data.content || data.content.trim().length === 0) {
        throw new Error("Gemini API hat leeren Inhalt zurückgegeben");
      }

      console.log("✅ Detailed newsletter generated successfully via Supabase, length:", data.content.length);
      return data.content;

    } catch (error) {
      console.error("Error generating detailed newsletter via Supabase:", error);
      
      if (error instanceof Error && error.message.includes("API")) {
        throw error;
      }
      
      throw new Error(`Fehler bei der Newsletter-Generierung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  public async generateArticleSummary(article: RssItem): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: { 
          action: 'generate-article-summary',
          data: { article }
        }
      });

      if (error) {
        console.error("Supabase function error:", error);
        return null;
      }

      if (data.error) {
        console.error("Gemini API Error:", data.error);
        return null;
      }

      return data.summary;

    } catch (error) {
      console.error("Error generating article summary via Supabase:", error);
      return null;
    }
  }

  public async extractArticleMetadata(url: string): Promise<Partial<RssItem>> {
    try {
      console.log(`Extracting metadata for: ${url}`);
      
      // Use RSS2JSON service to extract metadata
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=${this.rss2JsonApiKey}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`RSS2JSON API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error(`RSS2JSON error: ${data.message || 'Unknown error'}`);
      }
      
      // Extract basic metadata
      const metadata: Partial<RssItem> = {
        title: data.feed?.title || "Artikel ohne Titel",
        description: data.feed?.description || "Keine Beschreibung verfügbar",
        link: url
      };
      
      console.log("Metadata extracted:", metadata);
      return metadata;
      
    } catch (error) {
      console.error("Error extracting metadata:", error);
      
      // Fallback: try to extract title from URL
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || 'article';
      const title = lastPart.replace(/[-_]/g, ' ').replace(/\.(html|php|aspx?)$/i, '');
      
      return {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        description: "Keine Beschreibung verfügbar",
        link: url
      };
    }
  }
}

export default DecoderService;
