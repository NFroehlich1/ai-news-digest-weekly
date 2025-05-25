import { RssItem, WeeklyDigest } from "@/types/newsTypes";
import { toast } from "sonner";

class DecoderService {
  private apiKey: string;
  private rss2JsonApiKey: string = "4aslwlcwucxcdgqz3phqsqjglhcv7jgpwoxq4yso";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || "";
    console.log("DecoderService created with API key:", !!this.apiKey);
  }

  public setApiKey(apiKey: string): void {
    console.log("DecoderService: Setting new API key:", !!apiKey);
    this.apiKey = apiKey;
  }

  public getRss2JsonApiKey(): string {
    return this.rss2JsonApiKey;
  }

  // Verify API key method with direct Gemini API test
  public async verifyApiKey(): Promise<{ isValid: boolean; message: string }> {
    console.log("=== VERIFYING GEMINI API KEY ===");
    console.log("API Key present:", !!this.apiKey);
    
    if (!this.apiKey) {
      return { isValid: false, message: "Kein API-Schlüssel vorhanden" };
    }

    if (this.apiKey === "gemini-api-key-placeholder") {
      return { isValid: false, message: "Platzhalter-API-Schlüssel erkannt" };
    }

    try {
      console.log("Testing Gemini API with key:", this.apiKey.substring(0, 10) + "...");
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Test"
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10,
          }
        })
      });

      if (response.ok) {
        console.log("✅ Gemini API key verification successful");
        return { isValid: true, message: "Gemini API-Schlüssel ist gültig" };
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
        console.error("❌ Gemini API verification failed:", errorMessage);
        return { isValid: false, message: `API-Schlüssel ungültig: ${errorMessage}` };
      }
    } catch (error) {
      console.error("❌ Gemini API verification error:", error);
      return { isValid: false, message: `Verbindungsfehler: ${(error as Error).message}` };
    }
  }

  // Enhanced newsletter generation with detailed analysis using Gemini API
  public async generateSummary(digest: WeeklyDigest, selectedArticles?: RssItem[], linkedInPage?: string): Promise<string> {
    console.log("=== DECODER SERVICE GENERATE SUMMARY WITH GEMINI ===");
    console.log("API Key present:", !!this.apiKey);
    console.log("API Key value:", this.apiKey ? this.apiKey.substring(0, 10) + "..." : "NONE");
    
    if (!this.apiKey) {
      const error = "Gemini API-Schlüssel ist erforderlich für die Newsletter-Generierung";
      console.error(error);
      throw new Error(error);
    }

    // Check if we're using the wrong API key (RSS2JSON instead of Gemini)
    if (this.apiKey === this.rss2JsonApiKey) {
      const error = "Falscher API-Schlüssel: Gemini API-Schlüssel erforderlich, nicht RSS2JSON";
      console.error(error);
      throw new Error(error);
    }

    const articlesToUse = selectedArticles || digest.items;
    
    if (articlesToUse.length === 0) {
      throw new Error("Keine Artikel für die Zusammenfassung verfügbar");
    }

    console.log(`Generating detailed summary for ${articlesToUse.length} articles`);
    console.log("Using Gemini API key:", this.apiKey.substring(0, 7) + "...");

    try {
      const prompt = `Du bist ein Experte für KI-Newsletter und schreibst detaillierte, professionelle Zusammenfassungen für das LINKIT WEEKLY. 

WICHTIGE ANFORDERUNGEN:
- Schreibe einen ausführlichen, detaillierten Newsletter mit mindestens 800-1200 Wörtern
- Analysiere jeden Artikel tiefgehend und erkläre die Bedeutung für die KI-Branche
- Verwende eine professionelle, aber zugängliche Sprache
- Strukturiere den Newsletter klar mit Überschriften und Unterpunkten
- Füge Kontext und Hintergrundinformationen hinzu
- Erkläre technische Konzepte verständlich
- Zeige Verbindungen zwischen verschiedenen Entwicklungen auf
- Bewerte die Auswirkungen auf verschiedene Branchen und Anwendungsbereiche

STRUKTUR:
1. Einleitung mit Überblick über die Woche
2. Hauptartikel mit detaillierter Analyse (jeweils 150-200 Wörter pro Artikel)
3. Trends und Patterns der Woche
4. Ausblick und Implikationen
5. Fazit

Verwende Markdown-Formatierung für bessere Lesbarkeit.

Erstelle einen detaillierten Newsletter für Kalenderwoche ${digest.weekNumber}/${digest.year} (${digest.dateRange}) basierend auf diesen KI-Nachrichten:

${articlesToUse.map((article, index) => `
**Artikel ${index + 1}:**
Titel: ${article.title}
Beschreibung: ${article.description || 'Keine Beschreibung verfügbar'}
Link: ${article.link}
Datum: ${article.pubDate}
Quelle: ${article.sourceName || 'Unbekannte Quelle'}
`).join('\n')}

Bitte erstelle eine umfassende, detaillierte Analyse mit mindestens 800-1200 Wörtern. Erkläre die Bedeutung jeder Entwicklung, füge Kontext hinzu und zeige Verbindungen zwischen den verschiedenen Nachrichten auf.`;

      console.log("Making request to Gemini API...");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 3000,
          }
        })
      });

      console.log("Gemini API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = `Gemini API Fehler: ${response.status} - ${errorData?.error?.message || response.statusText}`;
        console.error("Gemini API Error:", errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Gemini API response received successfully");
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error("Invalid Gemini API response structure:", data);
        throw new Error("Unerwartete Antwort von der Gemini API");
      }

      let content = data.candidates[0].content.parts[0].text;
      
      if (!content || content.trim().length === 0) {
        throw new Error("Gemini API hat leeren Inhalt zurückgegeben");
      }
      
      // Add LinkedIn reference if not present and linkedInPage is provided
      if (linkedInPage && !content.includes("linkedin.com/company/linkit-karlsruhe")) {
        content += `\n\n---\n\n**Bleiben Sie verbunden:**\nFür weitere Updates und Diskussionen besuchen Sie unsere [LinkedIn-Seite](${linkedInPage}).`;
      }

      console.log("✅ Detailed newsletter generated successfully, length:", content.length);
      return content;

    } catch (error) {
      console.error("Error generating detailed newsletter:", error);
      
      if (error instanceof Error && error.message.includes("API")) {
        throw error;
      }
      
      throw new Error(`Fehler bei der Newsletter-Generierung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  public async generateArticleSummary(article: RssItem): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error("Gemini API-Schlüssel ist erforderlich für die Artikel-Zusammenfassung");
    }

    try {
      const prompt = `Du bist ein KI-Experte und fasst Artikel über künstliche Intelligenz prägnant zusammen. Schreibe eine kurze, aber informative Zusammenfassung in 2-3 Sätzen auf Deutsch.

Fasse diesen KI-Artikel zusammen:
              
Titel: ${article.title}
Beschreibung: ${article.description || 'Keine Beschreibung verfügbar'}
Link: ${article.link}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Gemini API Fehler: ${response.status} - ${errorData?.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error("Unerwartete Antwort von der Gemini API");
      }

      return data.candidates[0].content.parts[0].text;

    } catch (error) {
      console.error("Error generating article summary:", error);
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
