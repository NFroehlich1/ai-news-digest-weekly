
import { toast } from "sonner";
import { WeeklyDigest, RssItem } from "./NewsService";

class DecoderService {
  private apiKey: string;
  // Default API key for Gemini API
  private defaultApiKey: string = "AIzaSyA_hFXBg2EOipSEgF7nJxxDET632Kw1YFc";
  // Default API key for RSS2JSON service (free tier)
  private rss2jsonApiKey: string = "qbcrwnepkv8jmcr09zzxgtsmpnjmwroec9aymj1e";
  private googleApiUrl = "https://customsearch.googleapis.com/customsearch/v1";
  private geminiApiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || this.defaultApiKey;
  }
  
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  getRss2JsonApiKey(): string {
    return this.rss2jsonApiKey;
  }
  
  getDefaultApiKey(): string {
    return this.defaultApiKey;
  }
  
  async searchDecoderContent(query: string): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error("API-Schlüssel nicht gesetzt");
      }
      
      // The cx parameter is for Custom Search Engine ID - this should be specific to The Decoder
      // For demo purposes, we're using a placeholder
      const cx = "017576662512468239146:omuauf_lfve"; // This should be updated with actual Decoder search engine ID
      const url = `${this.googleApiUrl}?key=${this.apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API-Fehler: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Suchanfrage-Fehler:", error);
      toast.error(`Fehler bei der Suchanfrage: ${(error as Error).message}`);
      return null;
    }
  }
  
  async generateSummary(digest: WeeklyDigest, selectedArticles?: RssItem[]): Promise<string> {
    try {
      // Use selected articles if provided, otherwise use top 5 from digest
      const items = selectedArticles || digest.items.slice(0, 5);
      
      // Get titles and descriptions to create a prompt
      const contentSummaries = items.map(item => 
        `Titel: ${item.title}\nBeschreibung: ${item.description.substring(0, 150)}...\nURL: ${item.link}\n`
      ).join("\n");
      
      // Create a prompt for Gemini
      const prompt = `Erstelle einen strukturierten Newsletter im LINKIT-Format für KW ${digest.weekNumber} (${digest.dateRange}) 
      basierend auf diesen AI-News-Artikeln:
      
      ${contentSummaries}
      
      Das Format soll sein:
      - Überschrift: "📬 LINKIT WEEKLY"
      - Unterüberschrift: "Dein Update zu KI, Data Science und Industrie 4.0"
      - Kalendarwoche und Datum
      - Persönliche Anrede
      - Kurze Einleitung
      - Zusammenfassungen der wichtigsten Nachrichtenartikel mit Titeln und kurzen Beschreibungen
      - WICHTIG: Direkten Link zu JEDEM Artikel einfügen (mit Format [Details hier](URL))
      - Eine "Kurz & Knapp" Sektion mit Aufzählungspunkten
      - Abschluss mit Hinweis auf LINKIT-Veranstaltungen
      - Signatur des LINKIT-Teams
      
      Schreibe in einem freundlichen, informativen Stil mit Markdown-Formatierung.`;
      
      // Use Gemini API
      const url = `${this.geminiApiUrl}?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API error:", errorData);
        throw new Error(`Gemini API-Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract the generated text from the response
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (!generatedText) {
        // Fallback to formatted newsletter if Gemini fails
        return this.formatNewsletter(digest, items);
      }
      
      return generatedText;
    } catch (error) {
      console.error("Generierungsfehler:", error);
      toast.error(`Fehler bei der Zusammenfassung: ${(error as Error).message}`);
      // Fallback to formatted newsletter if there's an error
      return this.formatNewsletter(digest, selectedArticles || digest.items.slice(0, 5));
    }
  }
  
  private formatNewsletter(digest: WeeklyDigest, items: RssItem[]): string {
    const { weekNumber, dateRange } = digest;
    
    return `
# 📬 LINKIT WEEKLY
## Dein Update zu KI, Data Science und Industrie 4.0 
### KW ${weekNumber} · ${dateRange}

Hey zusammen,

hier ein schneller Überblick über das, was diese Woche Spannendes im KI-Bereich passiert ist – einfach und auf den Punkt gebracht. Vielleicht hilft's euch bei aktuellen Projekten oder inspiriert euch fürs nächste Semester:

${items.map((item, idx) => `
### ${item.title}
${item.description.substring(0, 150)}...

👉 [Details hier](${item.link})
${idx < items.length - 1 ? '' : ''}
`).join('')}

## 🎯 Kurz & Knapp für euch zusammengefasst:
${items.map(item => `- ${item.title.split(':')[0]}`).join('\n')}

## 🚀 Du hast Interesse, dich tiefergehend mit spannenden Themen rund um KI, Data Science und Industrie 4.0 zu beschäftigen?

Komm gerne bei einem unserer Mitgliederabende und Veranstaltungen vorbei – wir freuen uns auf dich!

👉 Infos & Termine unter linkit.kit.edu

Euer LINKIT-Team
Hochschulgruppe für Data Science & Industrie 4.0 am KIT
`;
  }
}

export default DecoderService;
