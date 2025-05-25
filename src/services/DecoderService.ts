import { RssItem, WeeklyDigest } from "@/types/newsTypes";
import { toast } from "sonner";

class DecoderService {
  private apiKey: string;
  private rss2JsonApiKey: string = "4aslwlcwucxcdgqz3phqsqjglhcv7jgpwoxq4yso";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || "";
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  public getRss2JsonApiKey(): string {
    return this.rss2JsonApiKey;
  }

  // Enhanced newsletter generation with detailed analysis
  public async generateSummary(digest: WeeklyDigest, selectedArticles?: RssItem[], linkedInPage?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("API-Schlüssel ist erforderlich für die Newsletter-Generierung");
    }

    const articlesToUse = selectedArticles || digest.items;
    
    if (articlesToUse.length === 0) {
      throw new Error("Keine Artikel für die Zusammenfassung verfügbar");
    }

    console.log(`Generating detailed summary for ${articlesToUse.length} articles`);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Du bist ein Experte für KI-Newsletter und schreibst detaillierte, professionelle Zusammenfassungen für das LINKIT WEEKLY. 

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

Verwende Markdown-Formatierung für bessere Lesbarkeit.`
            },
            {
              role: "user",
              content: `Erstelle einen detaillierten Newsletter für Kalenderwoche ${digest.weekNumber}/${digest.year} (${digest.dateRange}) basierend auf diesen KI-Nachrichten:

${articlesToUse.map((article, index) => `
**Artikel ${index + 1}:**
Titel: ${article.title}
Beschreibung: ${article.description || 'Keine Beschreibung verfügbar'}
Link: ${article.link}
Datum: ${article.pubDate}
Quelle: ${article.source}
`).join('\n')}

Bitte erstelle eine umfassende, detaillierte Analyse mit mindestens 800-1200 Wörtern. Erkläre die Bedeutung jeder Entwicklung, füge Kontext hinzu und zeige Verbindungen zwischen den verschiedenen Nachrichten auf.`
            }
          ],
          max_tokens: 3000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`OpenAI API Fehler: ${response.status} - ${errorData?.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Unerwartete Antwort von der OpenAI API");
      }

      let content = data.choices[0].message.content;
      
      // Add LinkedIn reference if not present and linkedInPage is provided
      if (linkedInPage && !content.includes("linkedin.com/company/linkit-karlsruhe")) {
        content += `\n\n---\n\n**Bleiben Sie verbunden:**\nFür weitere Updates und Diskussionen besuchen Sie unsere [LinkedIn-Seite](${linkedInPage}).`;
      }

      console.log("✅ Detailed newsletter generated successfully");
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
      throw new Error("API-Schlüssel ist erforderlich für die Artikel-Zusammenfassung");
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Du bist ein KI-Experte und fasst Artikel über künstliche Intelligenz prägnant zusammen. Schreibe eine kurze, aber informative Zusammenfassung in 2-3 Sätzen auf Deutsch."
            },
            {
              role: "user",
              content: `Fasse diesen KI-Artikel zusammen:
              
Titel: ${article.title}
Beschreibung: ${article.description || 'Keine Beschreibung verfügbar'}
Link: ${article.link}`
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`OpenAI API Fehler: ${response.status} - ${errorData?.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Unerwartete Antwort von der OpenAI API");
      }

      return data.choices[0].message.content;

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
