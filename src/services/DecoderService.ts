
import { toast } from "sonner";
import { WeeklyDigest } from "./NewsService";

class DecoderService {
  private apiKey: string;
  // Default API key for Google API
  private defaultApiKey: string = "AIzaSyCp8HTHYf3lN7jwzVYfoBOAkcEgqkJ7jxY";
  // Default API key for RSS2JSON service (free tier)
  private rss2jsonApiKey: string = "qbcrwnepkv8jmcr09zzxgtsmpnjmwroec9aymj1e";
  private googleApiUrl = "https://customsearch.googleapis.com/customsearch/v1";
  
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
  
  async generateSummary(digest: WeeklyDigest): Promise<string> {
    try {
      // For demo purposes, we'll return a formatted summary
      // In a real-world scenario, we would call an API with the API key
      
      // Get titles and create a prompt
      const titles = digest.items.map(item => item.title).join(", ");
      const prompt = `Zusammenfassung der wichtigsten KI-Nachrichten der Woche ${digest.weekNumber}: ${titles}`;
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Return mock generated content
      return this.formatNewsletter(digest);
    } catch (error) {
      console.error("Generierungsfehler:", error);
      toast.error(`Fehler bei der Zusammenfassung: ${(error as Error).message}`);
      return "";
    }
  }
  
  private formatNewsletter(digest: WeeklyDigest): string {
    const { weekNumber, dateRange, items } = digest;
    const topItems = items.slice(0, 5); // Take top 5 news items
    
    return `
# 📬 LINKIT WEEKLY
## Dein Update zu KI, Data Science und Industrie 4.0 
### KW ${weekNumber} · ${dateRange}

Hey zusammen,

hier ein schneller Überblick über das, was diese Woche Spannendes im KI-Bereich passiert ist – einfach und auf den Punkt gebracht. Vielleicht hilft's euch bei aktuellen Projekten oder inspiriert euch fürs nächste Semester:

${topItems.map((item, idx) => `
### ${item.title}
${item.description.substring(0, 150)}...

👉 [Details hier](${item.link})
${idx < topItems.length - 1 ? '' : ''}
`).join('')}

## 🎯 Kurz & Knapp für euch zusammengefasst:
${topItems.map(item => `- ${item.title.split(':')[0]}`).join('\n')}

## 🚀 Du hast Interesse, dich tiefergehend mit spannenden Themen rund um KI, Data Science und Industrie 4.0 zu beschäftigen?

Komm gerne bei einem unserer Mitgliederabende und Veranstaltungen vorbei – wir freuen uns auf dich!

👉 Infos & Termine unter linkit.kit.edu

Euer LINKIT-Team
Hochschulgruppe für Data Science & Industrie 4.0 am KIT
`;
  }
}

export default DecoderService;
