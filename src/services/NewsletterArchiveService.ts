
import { supabase } from "@/integrations/supabase/client";
import { WeeklyDigest } from "@/types/newsTypes";
import { toast } from "sonner";

export interface NewsletterArchiveEntry {
  id: string;
  week_number: number;
  year: number;
  date_range: string;
  title: string;
  content: string;
  html_content?: string;
  created_at: string;
  updated_at: string;
  article_count: number;
}

export default class NewsletterArchiveService {
  
  // Save newsletter to archive
  public async saveNewsletter(
    digest: WeeklyDigest, 
    content: string, 
    htmlContent?: string
  ): Promise<NewsletterArchiveEntry | null> {
    try {
      console.log("=== NEWSLETTER ARCHIVE SERVICE: SAVING ===");
      console.log("Input validation:", {
        hasDigest: !!digest,
        hasContent: !!content,
        contentLength: content?.length || 0,
        weekNumber: digest?.weekNumber,
        year: digest?.year,
        itemCount: digest?.items?.length || 0
      });

      if (!digest || !content) {
        throw new Error("Digest und Content sind erforderlich");
      }

      if (!digest.weekNumber || !digest.year) {
        throw new Error("Wochennummer und Jahr sind erforderlich");
      }

      const title = `LINKIT WEEKLY - KW ${digest.weekNumber}/${digest.year}`;
      
      console.log("Attempting to insert newsletter:", {
        week_number: digest.weekNumber,
        year: digest.year,
        title,
        content_length: content.length,
        date_range: digest.dateRange
      });
      
      // First try to insert
      const { data, error } = await supabase
        .from('newsletter_archive')
        .insert({
          week_number: digest.weekNumber,
          year: digest.year,
          date_range: digest.dateRange,
          title: title,
          content: content,
          html_content: htmlContent,
          article_count: digest.items.length
        })
        .select()
        .single();

      if (error) {
        console.error("Insert error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // If entry already exists (unique constraint violation), update it
        if (error.code === '23505') {
          console.log("Entry exists, attempting update...");
          return await this.updateNewsletter(digest, content, htmlContent);
        }
        
        console.error("Unhandled database error:", error);
        throw new Error(`Datenbankfehler: ${error.message}`);
      }

      console.log("✅ Newsletter successfully inserted:", {
        id: data?.id,
        week_number: data?.week_number,
        year: data?.year,
        title: data?.title
      });
      
      return data;
    } catch (error) {
      console.error("❌ Error in saveNewsletter:", error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(`Fehler beim Speichern im Newsletter-Archiv: ${errorMessage}`);
      return null;
    }
  }

  // Update existing newsletter in archive
  private async updateNewsletter(
    digest: WeeklyDigest, 
    content: string, 
    htmlContent?: string
  ): Promise<NewsletterArchiveEntry | null> {
    try {
      console.log("=== NEWSLETTER ARCHIVE SERVICE: UPDATING ===");
      
      const title = `LINKIT WEEKLY - KW ${digest.weekNumber}/${digest.year}`;
      
      console.log("Attempting to update newsletter:", {
        week_number: digest.weekNumber,
        year: digest.year,
        title,
        content_length: content.length
      });
      
      const { data, error } = await supabase
        .from('newsletter_archive')
        .update({
          content: content,
          html_content: htmlContent,
          article_count: digest.items.length,
          title: title,
          updated_at: new Date().toISOString()
        })
        .eq('week_number', digest.weekNumber)
        .eq('year', digest.year)
        .select()
        .single();

      if (error) {
        console.error("Update error details:", {
          code: error.code,
          message: error.message,
          details: error.details
        });
        throw new Error(`Update-Fehler: ${error.message}`);
      }

      console.log("✅ Newsletter successfully updated:", {
        id: data?.id,
        week_number: data?.week_number,
        year: data?.year,
        updated_at: data?.updated_at
      });
      
      return data;
    } catch (error) {
      console.error("❌ Error in updateNewsletter:", error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(`Fehler beim Aktualisieren im Newsletter-Archiv: ${errorMessage}`);
      return null;
    }
  }

  // Get all newsletters from archive
  public async getNewsletters(): Promise<NewsletterArchiveEntry[]> {
    try {
      console.log("=== FETCHING NEWSLETTER ARCHIVE ===");
      
      const { data, error } = await supabase
        .from('newsletter_archive')
        .select('*')
        .order('year', { ascending: false })
        .order('week_number', { ascending: false });

      if (error) {
        console.error("Fetch error:", error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} newsletters from archive`);
      return data || [];
    } catch (error) {
      console.error("❌ Error fetching newsletters from archive:", error);
      toast.error("Fehler beim Laden des Newsletter-Archivs");
      return [];
    }
  }

  // Get newsletter by week and year
  public async getNewsletterByWeek(weekNumber: number, year: number): Promise<NewsletterArchiveEntry | null> {
    try {
      console.log(`=== FETCHING NEWSLETTER FOR WEEK ${weekNumber}/${year} ===`);
      
      const { data, error } = await supabase
        .from('newsletter_archive')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('year', year)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log("No newsletter found for this week");
          return null; // No data found
        }
        console.error("Fetch error:", error);
        throw error;
      }

      console.log("✅ Newsletter found:", data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching newsletter by week:", error);
      return null;
    }
  }

  // Delete newsletter from archive
  public async deleteNewsletter(id: string): Promise<boolean> {
    try {
      console.log(`=== DELETING NEWSLETTER ${id} ===`);
      
      const { error } = await supabase
        .from('newsletter_archive')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Delete error:", error);
        throw error;
      }

      console.log("✅ Newsletter deleted successfully");
      toast.success("Newsletter aus Archiv gelöscht");
      return true;
    } catch (error) {
      console.error("❌ Error deleting newsletter:", error);
      toast.error("Fehler beim Löschen des Newsletters");
      return false;
    }
  }
}
