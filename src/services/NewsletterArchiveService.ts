
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
      console.log("=== SAVING TO NEWSLETTER ARCHIVE ===");
      console.log("Digest data:", {
        weekNumber: digest.weekNumber,
        year: digest.year,
        dateRange: digest.dateRange,
        itemCount: digest.items.length
      });

      const title = `LINKIT WEEKLY - KW ${digest.weekNumber}/${digest.year}`;
      
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
        console.error("Insert error:", error);
        
        // If entry already exists (unique constraint violation), update it
        if (error.code === '23505') {
          console.log("Entry exists, updating instead...");
          return await this.updateNewsletter(digest, content, htmlContent);
        }
        throw error;
      }

      console.log("✅ Newsletter saved to archive successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error saving newsletter to archive:", error);
      toast.error(`Fehler beim Speichern im Newsletter-Archiv: ${(error as Error).message}`);
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
      console.log("=== UPDATING NEWSLETTER ARCHIVE ===");
      
      const title = `LINKIT WEEKLY - KW ${digest.weekNumber}/${digest.year}`;
      
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
        console.error("Update error:", error);
        throw error;
      }

      console.log("✅ Newsletter updated in archive successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error updating newsletter in archive:", error);
      toast.error(`Fehler beim Aktualisieren im Newsletter-Archiv: ${(error as Error).message}`);
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
