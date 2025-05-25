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
  
  // Save newsletter to archive with comprehensive debugging
  public async saveNewsletter(
    digest: WeeklyDigest, 
    content: string, 
    htmlContent?: string
  ): Promise<NewsletterArchiveEntry | null> {
    try {
      console.log("=== NEWSLETTER ARCHIVE SERVICE: COMPREHENSIVE DEBUG START ===");
      
      // Step-by-step validation with detailed logging
      console.log("STEP 1: Input validation");
      if (!digest) {
        console.error("❌ VALIDATION FAILED: Digest is null or undefined");
        throw new Error("Digest ist erforderlich");
      }
      console.log("✅ Digest object exists");
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        console.error("❌ VALIDATION FAILED: Content is invalid", {
          hasContent: !!content,
          type: typeof content,
          length: content?.length,
          trimmedLength: content?.trim?.()?.length
        });
        throw new Error("Newsletter-Inhalt ist erforderlich und darf nicht leer sein");
      }
      console.log("✅ Content validation passed", {
        type: typeof content,
        length: content.length,
        trimmedLength: content.trim().length
      });
      
      if (!digest.weekNumber || !digest.year) {
        console.error("❌ VALIDATION FAILED: Week number or year missing", {
          weekNumber: digest.weekNumber,
          weekNumberType: typeof digest.weekNumber,
          year: digest.year,
          yearType: typeof digest.year
        });
        throw new Error("Wochennummer und Jahr sind erforderlich");
      }
      console.log("✅ Week/Year validation passed", {
        weekNumber: digest.weekNumber,
        year: digest.year
      });

      console.log("STEP 2: Preparing data for database");
      const title = `LINKIT WEEKLY - KW ${digest.weekNumber}/${digest.year}`;
      
      const insertData = {
        week_number: digest.weekNumber,
        year: digest.year,
        date_range: digest.dateRange,
        title: title,
        content: content.trim(),
        html_content: htmlContent,
        article_count: digest.items?.length || 0
      };
      
      console.log("✅ Insert data prepared:", {
        week_number: insertData.week_number,
        year: insertData.year,
        date_range: insertData.date_range,
        title: insertData.title,
        contentLength: insertData.content.length,
        hasHtmlContent: !!insertData.html_content,
        article_count: insertData.article_count
      });
      
      console.log("STEP 3: Attempting database insert");
      console.log("Using Supabase client to insert into newsletter_archive table...");
      
      // Test database connection first
      const { data: testData, error: testError } = await supabase
        .from('newsletter_archive')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error("❌ DATABASE CONNECTION TEST FAILED:", testError);
        throw new Error(`Datenbankverbindung fehlgeschlagen: ${testError.message}`);
      }
      console.log("✅ Database connection test successful");
      
      // Try to insert
      const { data, error } = await supabase
        .from('newsletter_archive')
        .insert(insertData)
        .select()
        .single();

      console.log("STEP 4: Processing database response");
      if (error) {
        console.error("❌ DATABASE INSERT ERROR:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          insertData: {
            ...insertData,
            content: `${insertData.content.substring(0, 100)}...`
          }
        });
        
        // If entry already exists (unique constraint violation), try update
        if (error.code === '23505') {
          console.log("🔄 Entry exists, attempting update instead...");
          return await this.updateNewsletter(digest, content, htmlContent);
        }
        
        throw new Error(`Datenbankfehler beim Einfügen: ${error.message} (Code: ${error.code})`);
      }

      if (!data) {
        console.error("❌ INSERT SUCCESS BUT NO DATA RETURNED");
        throw new Error("Einfügen war erfolgreich, aber keine Daten zurückgegeben");
      }

      console.log("✅ DATABASE INSERT SUCCESSFUL:", {
        id: data.id,
        week_number: data.week_number,
        year: data.year,
        title: data.title,
        article_count: data.article_count,
        created_at: data.created_at
      });
      
      console.log("=== NEWSLETTER ARCHIVE SERVICE: SUCCESS ===");
      return data;
      
    } catch (error) {
      console.error("❌ CRITICAL ERROR in saveNewsletter:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack available');
      
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler beim Speichern";
      toast.error(`Archiv-Speicher-Fehler: ${errorMessage}`);
      throw error; // Re-throw to allow caller to handle
    }
  }

  // Update existing newsletter in archive
  private async updateNewsletter(
    digest: WeeklyDigest, 
    content: string, 
    htmlContent?: string
  ): Promise<NewsletterArchiveEntry | null> {
    try {
      console.log("=== NEWSLETTER ARCHIVE SERVICE: UPDATE OPERATION ===");
      
      const title = `LINKIT WEEKLY - KW ${digest.weekNumber}/${digest.year}`;
      
      const updateData = {
        content: content.trim(),
        html_content: htmlContent,
        article_count: digest.items?.length || 0,
        title: title,
        updated_at: new Date().toISOString()
      };
      
      console.log("📝 Attempting to update newsletter:", {
        week_number: digest.weekNumber,
        year: digest.year,
        updateData: {
          ...updateData,
          content: `${updateData.content.substring(0, 100)}...`
        }
      });
      
      const { data, error } = await supabase
        .from('newsletter_archive')
        .update(updateData)
        .eq('week_number', digest.weekNumber)
        .eq('year', digest.year)
        .select()
        .single();

      if (error) {
        console.error("❌ Update error details:", {
          code: error.code,
          message: error.message,
          details: error.details
        });
        throw new Error(`Update-Fehler: ${error.message}`);
      }
      
      if (!data) {
        console.error("❌ Update succeeded but no data returned");
        throw new Error("Update war erfolgreich, aber keine Daten zurückgegeben");
      }

      console.log("✅ Newsletter successfully updated in archive:", {
        id: data.id,
        week_number: data.week_number,
        year: data.year,
        updated_at: data.updated_at,
        article_count: data.article_count
      });
      
      return data;
    } catch (error) {
      console.error("❌ Critical error in updateNewsletter:", error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler beim Aktualisieren";
      toast.error(`Archiv-Update-Fehler: ${errorMessage}`);
      throw error;
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
