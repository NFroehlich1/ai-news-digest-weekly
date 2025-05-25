
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
      const title = `LINKIT WEEKLY - KW ${digest.weekNumber}/${digest.year}`;
      
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
        // If entry already exists, update it
        if (error.code === '23505') {
          return await this.updateNewsletter(digest, content, htmlContent);
        }
        throw error;
      }

      console.log("Newsletter saved to archive:", data);
      return data;
    } catch (error) {
      console.error("Error saving newsletter to archive:", error);
      toast.error("Fehler beim Speichern im Newsletter-Archiv");
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
      const title = `LINKIT WEEKLY - KW ${digest.weekNumber}/${digest.year}`;
      
      const { data, error } = await supabase
        .from('newsletter_archive')
        .update({
          content: content,
          html_content: htmlContent,
          article_count: digest.items.length,
          updated_at: new Date().toISOString()
        })
        .eq('week_number', digest.weekNumber)
        .eq('year', digest.year)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log("Newsletter updated in archive:", data);
      return data;
    } catch (error) {
      console.error("Error updating newsletter in archive:", error);
      toast.error("Fehler beim Aktualisieren im Newsletter-Archiv");
      return null;
    }
  }

  // Get all newsletters from archive
  public async getNewsletters(): Promise<NewsletterArchiveEntry[]> {
    try {
      const { data, error } = await supabase
        .from('newsletter_archive')
        .select('*')
        .order('year', { ascending: false })
        .order('week_number', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching newsletters from archive:", error);
      toast.error("Fehler beim Laden des Newsletter-Archivs");
      return [];
    }
  }

  // Get newsletter by week and year
  public async getNewsletterByWeek(weekNumber: number, year: number): Promise<NewsletterArchiveEntry | null> {
    try {
      const { data, error } = await supabase
        .from('newsletter_archive')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('year', year)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No data found
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error fetching newsletter by week:", error);
      return null;
    }
  }

  // Delete newsletter from archive
  public async deleteNewsletter(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('newsletter_archive')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success("Newsletter aus Archiv gelöscht");
      return true;
    } catch (error) {
      console.error("Error deleting newsletter:", error);
      toast.error("Fehler beim Löschen des Newsletters");
      return false;
    }
  }
}
