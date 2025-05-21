import { toast } from "sonner";
import type { WeeklyDigest, RssItem } from "../types/newsTypes";
import { supabase } from "@/integrations/supabase/client";

class DecoderService {
  private apiKey: string;
  // Default API key for Google AI API
  private defaultApiKey: string = "AIzaSyDLVTnP6DxlDqnyXYSZ-i_tkeopxDgm_u0";
  // Default API key for RSS2JSON service (free tier)
  private rss2jsonApiKey: string = "qbcrwnepkv8jmcr09zzxgtsmpnjmwroec9aymj1e";
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
  
  // Verify if the API key is working correctly
  async verifyApiKey(): Promise<{ isValid: boolean; message: string }> {
    try {
      if (!this.apiKey) {
        return { isValid: false, message: "API-Schlüssel fehlt" };
      }
      
      console.log("Verifying Google AI API key...");
      
      const testPrompt = "Hello, this is a test. Please respond with 'API key is working'";
      const apiUrl = `${this.aiApiUrl}?key=${this.apiKey}`;
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: testPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 50,
          }
        })
      });
      
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("API key verification failed:", errorData);
        
        // Check for specific error types
        if (response.status === 403) {
          return { isValid: false, message: "API-Schlüssel ungültig oder keine Zugriffsrechte" };
        } else if (response.status === 429) {
          return { isValid: false, message: "Anfragelimit für den API-Schlüssel überschritten" };
        }
        
        return { isValid: false, message: `API-Fehler: ${response.status}` };
      }
      
      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      console.log("API test response:", generatedText);
      
      return { isValid: true, message: "API-Schlüssel funktioniert" };
    } catch (error) {
      console.error("API key verification error:", error);
      return { isValid: false, message: `Verbindungsfehler: ${(error as Error).message}` };
    }
  }
  
  // Verbesserte Funktion zur Generierung von Artikel-Zusammenfassungen
  async generateArticleSummary(article: Partial<RssItem>): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error("API-Schlüssel nicht gesetzt");
      }
      
      const apiUrl = `${this.aiApiUrl}?key=${this.apiKey}`;
      
      // Optimierter Prompt für bessere Zusammenfassungen
      const prompt = `
      Erstelle eine präzise, informative Zusammenfassung (1-3 Sätze) für den folgenden Artikel:
      
      Titel: ${article.title}
      Beschreibung: ${article.description || ""}
      URL: ${article.link}
      ${article.content ? `Inhalt: ${article.content.substring(0, 500)}...` : ""}
      ${article.sourceName ? `Quelle: ${article.sourceName}` : ""}
      
      Die Zusammenfassung soll:
      1. Den Kerninhalt des Artikels erfassen
      2. Auf Deutsch sein und in einem sachlichen Ton
      3. Relevante technische Begriffe und Namen enthalten
      4. Speziell für KI-News geeignet sein
      
      Antworte nur mit der Zusammenfassung, ohne Einleitung oder Abschluss.
      `;
      
      console.log("Requesting improved AI summary for article:", article.title);
      
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
            temperature: 0.4, // Etwas höher für bessere Variation
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 300, // Erhöht für längere Zusammenfassungen
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI summary generation API error:", errorText);
        return article.description || "";
      }
      
      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      console.log("Generated AI summary:", summary);
      
      if (!summary) {
        return article.description || "";
      }
      
      // Clean up the summary (remove quotes, trim, etc.)
      return summary.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      console.error("Summary generation error:", error);
      // Verbesserte Fallback-Logik
      if (article.description && article.description.length > 10) {
        return article.description;
      } else if (article.title) {
        return `Artikel über ${article.title.split(' ').slice(0, 3).join(' ')}...`;
      } else {
        return "Artikel über KI-Technologie und Innovation.";
      }
    }
  }

  // Extract metadata from a URL using Google AI API
  async extractArticleMetadata(url: string): Promise<Partial<RssItem>> {
    try {
      if (!this.apiKey) {
        throw new Error("API-Schlüssel nicht gesetzt");
      }
      
      console.log("Fetching metadata for:", url);
      
      // For The Decoder articles, ensure we get a proper title instead of using a placeholder
      if (url.includes('the-decoder.de')) {
        console.log("Specialized handling for The Decoder article metadata");
        
        try {
          // Direktes Abrufen der Artikelseite über CORS Proxy
          const proxyUrl = `https://corsproxy.io/?${url}`;
          const response = await fetch(proxyUrl, {
            headers: {
              'Accept': 'text/html',
              'User-Agent': 'Mozilla/5.0 (compatible; NewsDigestApp/1.0)'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch article: ${response.status}`);
          }
          
          const html = await response.text();
          
          // Extraktion von Metadaten aus HTML
          const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const title = titleMatch ? titleMatch[1].trim() : url.split('/').pop()?.replace(/-/g, ' ');
          
          // Extrahieren der Beschreibung
          const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
          const description = descMatch ? descMatch[1] : "";
          
          // Bild URL extrahieren
          const imgMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
          const imageUrl = imgMatch ? imgMatch[1] : undefined;
          
          // AI Zusammenfassung generieren mit dem Inhalt
          let content = "";
          const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
          if (articleMatch) {
            // Extrahieren des eigentlichen Artikeltexts
            const articleHtml = articleMatch[1];
            const textOnly = articleHtml.replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 1500);
            content = textOnly;
          }
          
          const metadata = {
            title: title || "Artikel von The Decoder",
            description: description || "Ein Artikel über KI und Technologie",
            content: content,
            link: url,
            categories: ["KI", "Technologie", "The Decoder"],
            imageUrl,
            sourceName: "The Decoder"
          };
          
          // Generate AI summary using extracted content
          const aiSummary = await this.generateArticleSummary({
            ...metadata,
            pubDate: new Date().toISOString()
          });
          
          return {
            ...metadata,
            aiSummary
          };
        } catch (scrapingError) {
          console.error("Error scraping The Decoder article:", scrapingError);
          // Fallback to AI extraction
        }
      }
      
      // For non-Decoder articles, use standard extraction
      const apiUrl = `${this.aiApiUrl}?key=${this.apiKey}`;
      
      const prompt = `
      Extract metadata from this URL: ${url}
      
      Please provide the following information as a JSON object:
      1. title: The title of the article
      2. description: A short summary or description 
      3. categories: Array of categories/tags relevant to the content (max 3)
      4. imageUrl: URL of the main image (if any)
      
      Return ONLY a valid JSON object without any explanations or markdown.
      `;
      
      console.log("Sending request to Google AI API for metadata extraction");
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
      
      console.log("Google AI API response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error:", errorText);
        // If API fails, create placeholder data based on URL
        const domain = new URL(url).hostname;
        return this.generateFallbackMetadata(url, domain);
      }
      
      const data = await response.json();
      console.log("Google AI API response data:", data);
      
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (!generatedText) {
        console.error("No text generated by API");
        return this.generateFallbackMetadata(url);
      }
      
      // Extract JSON from text (handle case where AI might add backticks or explanations)
      let jsonText = generatedText;
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      try {
        console.log("Parsing JSON:", jsonText);
        const metadata = JSON.parse(jsonText);
        
        // Generate an AI summary after getting metadata
        const aiSummary = await this.generateArticleSummary({
          title: metadata.title,
          description: metadata.description,
          link: url,
          pubDate: new Date().toISOString(),
          content: ""
        });
        
        return {
          ...metadata,
          link: url,
          sourceName: new URL(url).hostname.replace('www.', ''),
          aiSummary
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
      
      // Always attempt to generate an AI summary, even for fallback metadata
      const description = `Ein Artikel über KI und Technologie von ${domain}`;
      
      return {
        title: titleFromUrl,
        description: description,
        categories: ["KI", "Technologie"],
        sourceName: domain.replace('www.', ''),
      };
    } catch (error) {
      // If URL parsing fails, return very basic info
      return {
        title: "KI-Artikel",
        description: "Ein Artikel über KI und Technologie",
        categories: ["KI", "Technologie"],
        sourceName: "Externe Quelle",
      };
    }
  }
  
  // Generate summary for a single article
  async generateArticleSummary(article: Partial<RssItem>): Promise<string> {
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
      
      console.log("Requesting AI summary for article:", article.title);
      
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
        const errorText = await response.text();
        console.error("AI summary generation API error:", errorText);
        return article.description || "";
      }
      
      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      console.log("Generated AI summary:", summary);
      
      if (!summary) {
        return article.description || "";
      }
      
      // Clean up the summary (remove quotes, trim, etc.)
      return summary.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      console.error("Summary generation error:", error);
      return article.description || "";
    }
  }
  
  // Generate newsletter summary
  async generateSummary(digest: WeeklyDigest, selectedArticles?: RssItem[], linkedInPage?: string): Promise<string> {
    try {
      // First verify if the API key is working
      const { isValid, message } = await this.verifyApiKey();
      if (!isValid) {
        toast.error(`API-Schlüssel Problem: ${message}`);
        throw new Error(`API-Schlüssel Problem: ${message}`);
      }
      
      // Use selected articles if provided, otherwise use top 5 from digest
      const items = selectedArticles || digest.items.slice(0, 5);
      
      // Get titles and descriptions to create a prompt
      const contentSummaries = items.map(item => 
        `Titel: ${item.title}\n${item.aiSummary ? 'AI-Zusammenfassung: ' + item.aiSummary : 'Beschreibung: ' + item.description.substring(0, 150) + '...'}\nURL: ${item.link}\n`
      ).join("\n");
      
      // Add LinkedIn page to prompt if provided
      const linkedInReference = linkedInPage ? 
        `\n\nFüge am Ende des Newsletters einen deutlichen Hinweis auf die LinkedIn-Seite ein: ${linkedInPage}` : '';
      
      // Create a prompt for Google AI with more comprehensive instructions
      const prompt = `Erstelle einen ausführlichen, detaillierten Newsletter im LINKIT-Format für KW ${digest.weekNumber} (${digest.dateRange}) 
      basierend auf diesen AI-News-Artikeln:
      
      ${contentSummaries}
      
      Das Format soll sein:
      - Überschrift: "📬 LINKIT WEEKLY"
      - Unterüberschrift: "Dein Update zu KI, Data Science und Industrie 4.0"
      - Kalendarwoche und Datum
      - Persönliche Anrede
      - Umfassende Einleitung mit Überblick über die wichtigsten Themen der Woche (2-3 Absätze)
      - Detaillierte Zusammenfassungen der Nachrichtenartikel mit:
          * prägnanten Überschriften
          * umfangreichen Beschreibungen (mindestens 4-5 Sätze pro Artikel)
          * Einordnung der Bedeutung für die KI-Branche
      - WICHTIG: Direkten Link zu JEDEM Artikel einfügen (mit Format [Details hier](URL))
      - Eine "Kurz & Knapp" Sektion mit informativen Aufzählungspunkten
      - Persönlichen Ausblick auf kommende KI-Entwicklungen
      - Abschluss mit Hinweis auf LINKIT-Veranstaltungen${linkedInReference}
      - Signatur des LINKIT-Teams
      
      Der Newsletter soll einen Wochenrückblick-Charakter haben, alle Aspekte der Artikel integrieren und tiefgreifende Einblicke bieten.
      Schreibe in einem freundlichen, informativen Stil mit Markdown-Formatierung.`;
      
      console.log("Generating comprehensive newsletter for digest:", digest.id);
      console.log("Prompt for AI:", prompt.substring(0, 200) + "...");
      
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
            maxOutputTokens: 3000, // Increased token limit for more comprehensive content
          }
        })
      });
      
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google AI API error for newsletter generation:", errorText);
        toast.error(`Fehler beim API-Aufruf: ${response.status}`);
        
        // Fallback to formatted newsletter if API fails
        return this.formatComprehensiveNewsletter(digest, items, linkedInPage);
      }
      
      const data = await response.json();
      console.log("API response structure:", Object.keys(data));
      
      // Extract the generated text from the response
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (!generatedText) {
        console.error("No newsletter text generated by API");
        toast.error("Keine Inhalte von der API erhalten");
        // Fallback to formatted newsletter if Google AI API fails
        return this.formatComprehensiveNewsletter(digest, items, linkedInPage);
      }
      
      console.log("Successfully generated comprehensive newsletter");
      toast.success("Newsletter erfolgreich generiert");
      
      // After generating the newsletter, save it to the subscribers who have confirmed
      try {
        // We're just logging this action for now, in a real implementation
        // this would trigger an email sending process
        console.log("Newsletter would be sent to confirmed subscribers");
      } catch (dbError) {
        console.error("Error preparing newsletter for sending:", dbError);
      }
      
      return generatedText;
    } catch (error) {
      console.error("Newsletter generation error:", error);
      toast.error(`Fehler bei der Zusammenfassung: ${(error as Error).message}`);
      // Fallback to formatted newsletter if there's an error
      return this.formatComprehensiveNewsletter(digest, selectedArticles || digest.items.slice(0, 5), linkedInPage);
    }
  }
  
  private formatComprehensiveNewsletter(digest: WeeklyDigest, items: RssItem[], linkedInPage?: string): string {
    const { weekNumber, dateRange } = digest;
    
    let newsletter = `
# 📬 LINKIT WEEKLY
## Dein Update zu KI, Data Science und Industrie 4.0 
### KW ${weekNumber} · ${dateRange}

Hey zusammen,

willkommen zu unserem ausführlichen Wochenrückblick! Die vergangene Woche brachte einige bedeutende Entwicklungen im KI-Bereich, die wir für euch zusammengefasst haben. Von revolutionären Fortschritten in der KI-Forschung bis hin zu praktischen Anwendungen in verschiedenen Industrien – diese Ausgabe bietet einen tiefgreifenden Einblick in die wichtigsten Themen der Woche.

Diese Entwicklungen könnten nicht nur die Forschungslandschaft verändern, sondern auch direkte Auswirkungen auf kommende Projekte und Anforderungen in der Berufswelt haben. Hier sind die wichtigsten Neuigkeiten der Woche:

${items.map((item, idx) => `
### ${item.title}

${item.aiSummary || item.description}

Diese Entwicklung ist besonders relevant, da sie ${item.categories?.includes('KI') ? 'neue Möglichkeiten für KI-Anwendungen eröffnet' : 'wichtige Auswirkungen auf die Technologiebranche hat'} und zeigt, wie schnell sich die Landschaft der digitalen Technologien weiterentwickelt.

👉 [Details hier](${item.link})
${idx < items.length - 1 ? '---' : ''}
`).join('\n')}

## 🎯 Kurz & Knapp für euch zusammengefasst:
${items.map(item => `- **${item.title.split(':')[0]}**: ${item.aiSummary ? item.aiSummary.split('.')[0] + '.' : 'Wichtige Entwicklung im KI-Bereich.'}`).join('\n')}

## 📊 Ausblick: Was uns in naher Zukunft erwartet

Die aktuellen Entwicklungen deuten darauf hin, dass wir in den kommenden Wochen weitere spannende Fortschritte in den Bereichen maschinelles Lernen, Datenanalyse und KI-Implementierung erwarten können. Besonders die Integration von KI in alltägliche Anwendungen dürfte weiter zunehmen.

## 🚀 Du hast Interesse, dich tiefergehend mit spannenden Themen rund um KI, Data Science und Industrie 4.0 zu beschäftigen?

Komm gerne bei einem unserer Mitgliederabende und Veranstaltungen vorbei – wir freuen uns auf dich und bieten regelmäßig Workshops, Vorträge und Networking-Möglichkeiten!

👉 Infos & Termine unter linkit.kit.edu

`;

    // Add LinkedIn reference if provided
    if (linkedInPage) {
      newsletter += `
Besucht auch unsere [LinkedIn-Seite](${linkedInPage}) für aktuelle Beiträge und Neuigkeiten, sowie Ankündigungen zu kommenden Events und Projekten!

`;
    }

    newsletter += `
Viele Grüße und bis nächste Woche,

Euer LINKIT-Team
Hochschulgruppe für Data Science & Industrie 4.0 am KIT
`;

    return newsletter;
  }
}

export default DecoderService;
