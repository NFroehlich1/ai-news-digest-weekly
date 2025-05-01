import { toast } from "sonner";
import type { WeeklyDigest, RssItem } from "../types/newsTypes";

class DecoderService {
  private apiKey: string;
  // Default API key for Google AI API
  private defaultApiKey: string = "AIzaSyA_hFXBg2EOipSEgF7nJxxDET632Kw1YFc";
  // Default API key for RSS2JSON service (free tier)
  private rss2jsonApiKey: string = "qbcrwnepkv8jmcr09zzxgtsmpnjmwroec9aymj1e";
  private googleApiUrl = "https://customsearch.googleapis.com/customsearch/v1";
  // Using Google AI API v1 instead of v1beta
  private aiApiUrl = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent";
  
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
  
  // Extract metadata from a URL using Google AI API
  async extractArticleMetadata(url: string): Promise<Partial<RssItem>> {
    try {
      if (!this.apiKey) {
        throw new Error("API-Schlüssel nicht gesetzt");
      }
      
      // Simple fallback for The Decoder articles since we can't access external content directly
      if (url.includes('the-decoder.de')) {
        // Extract title from URL
        const urlPath = new URL(url).pathname;
        const slug = urlPath.split('/').pop() || '';
        const titleFromSlug = slug
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
          
        return {
          title: titleFromSlug || "AI-Artikel von The Decoder",
          description: "Ein interessanter Artikel über KI-Technologie und Entwicklungen von The Decoder.",
          categories: ["KI", "Technologie"],
          imageUrl: "https://the-decoder.de/wp-content/uploads/2022/01/logo.png",
          sourceName: "The Decoder"
        };
      }
      
      // Use Google AI API to extract metadata
      const apiUrl = `${this.aiApiUrl}?key=${this.apiKey}`;
      
      const prompt = `
      Extract metadata from this URL: ${url}
      
      Please provide the following information as a JSON object:
      1. title: The title of the article
      2. description: A short summary or description 
      3. categories: Array of categories/tags relevant to the content (max 3)
      4. imageUrl: URL of the main image (if any)
      5. aiSummary: A concise 1-2 sentence summary of the article content
      
      Return ONLY a valid JSON object without any explanations or markdown.
      `;
      
      const response = await fetch(apiUrl, {
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
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });
      
      if (!response.ok) {
        // If API fails, create placeholder data based on URL
        const domain = new URL(url).hostname;
        return this.generateFallbackMetadata(url, domain);
      }
      
      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (!generatedText) {
        return this.generateFallbackMetadata(url);
      }
      
      // Extract JSON from text (handle case where AI might add backticks or explanations)
      let jsonText = generatedText;
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      try {
        const metadata = JSON.parse(jsonText);
        return {
          ...metadata,
          link: url,
          sourceName: new URL(url).hostname.replace('www.', '')
        };
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        return this.generateFallbackMetadata(url);
      }
    } catch (error) {
      console.error("Metadata extraction error:", error);
      return this.generateFallbackMetadata(url);
    }
  }
  
  // Generate fallback metadata when API fails
  private generateFallbackMetadata(url: string, domain?: string): Partial<RssItem> {
    try {
      domain = domain || new URL(url).hostname;
      // Extract a title-like string from the URL path
      const urlParts = url.split('/');
      let titleFromUrl = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || domain;
      
      // Clean up the title
      titleFromUrl = titleFromUrl
        .replace(/-/g, ' ')
        .replace(/\.(html|php|asp|jsp)$/i, '')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
        
      if (!titleFromUrl || titleFromUrl === '') {
        titleFromUrl = `Artikel von ${domain}`;
      }
      
      return {
        title: titleFromUrl,
        description: `Ein Artikel über KI und Technologie von ${domain}`,
        categories: ["KI", "Technologie"],
        sourceName: domain.replace('www.', ''),
        aiSummary: `Ein Artikel über aktuelle KI-Entwicklungen von ${domain}.`
      };
    } catch (error) {
      // If URL parsing fails, return very basic info
      return {
        title: "KI-Artikel",
        description: "Ein Artikel über KI und Technologie",
        categories: ["KI", "Technologie"],
        sourceName: "Externe Quelle",
        aiSummary: "Ein Artikel über aktuelle KI-Entwicklungen und Technologie."
      };
    }
  }
  
  // Generate summary for a single article
  async generateArticleSummary(article: RssItem): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error("API-Schlüssel nicht gesetzt");
      }
      
      const apiUrl = `${this.aiApiUrl}?key=${this.apiKey}`;
      
      const prompt = `
      Erstelle eine kurze Zusammenfassung (1-2 Sätze) für den folgenden Artikel:
      
      Titel: ${article.title}
      Beschreibung: ${article.description}
      URL: ${article.link}
      
      Die Zusammenfassung soll den Kern des Artikels erfassen und auf Deutsch sein.
      Antworte nur mit der Zusammenfassung, ohne Einleitung oder Abschluss.
      `;
      
      const response = await fetch(apiUrl, {
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
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 256,
          }
        })
      });
      
      if (!response.ok) {
        console.error("AI API error:", await response.text());
        return article.description;
      }
      
      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (!summary) {
        return article.description;
      }
      
      // Clean up the summary (remove quotes, trim, etc.)
      return summary.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      console.error("Summary generation error:", error);
      return article.description;
    }
  }
  
  // Search The Decoder content (unchanged)
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
  
  // Generate newsletter summary
  async generateSummary(digest: WeeklyDigest, selectedArticles?: RssItem[]): Promise<string> {
    try {
      // Use selected articles if provided, otherwise use top 5 from digest
      const items = selectedArticles || digest.items.slice(0, 5);
      
      // Get titles and descriptions to create a prompt
      const contentSummaries = items.map(item => 
        `Titel: ${item.title}\n${item.aiSummary ? 'AI-Zusammenfassung: ' + item.aiSummary : 'Beschreibung: ' + item.description.substring(0, 150) + '...'}\nURL: ${item.link}\n`
      ).join("\n");
      
      // Create a prompt for Google AI
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
      
      // Use Google AI API
      const url = `${this.aiApiUrl}?key=${this.apiKey}`;
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
        console.error("Google AI API error:", errorData);
        // Fallback to formatted newsletter if API fails
        return this.formatNewsletter(digest, items);
      }
      
      const data = await response.json();
      
      // Extract the generated text from the response
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (!generatedText) {
        // Fallback to formatted newsletter if Google AI API fails
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
