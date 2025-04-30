import { toast } from "sonner";
import DecoderService from "./DecoderService";
import { parseString } from "xml2js";

// Types for our RSS and news data
export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content: string;
  categories?: string[];
  creator?: string;
  guid?: string;
  imageUrl?: string;
}

export interface WeeklyDigest {
  id: string;
  weekNumber: number;
  year: number;
  dateRange: string;
  title: string;
  summary: string;
  items: RssItem[];
  generatedContent?: string;
  createdAt: Date;
}

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Get the current calendar week
export const getCurrentWeek = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return Math.ceil((dayOfYear + start.getDay()) / 7);
};

// Get the current year
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

// Get the date range for a week number
export const getWeekDateRange = (weekNumber: number, year: number): string => {
  const startDate = getDateOfISOWeek(weekNumber, year);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return `${formatDate(startDate.toISOString())}–${formatDate(endDate.toISOString())}`;
};

// Helper function to get the date of an ISO week
function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getDay();
  const date = simple;
  if (dayOfWeek <= 4) {
    date.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    date.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return date;
}

// Service class for fetching news from RSS feeds
class NewsService {
  private apiKey: string;
  private rssUrl: string = "https://the-decoder.de/feed/";
  private corsProxyUrl: string = "https://corsproxy.io/?";
  private decoderService: DecoderService;
  
  constructor(apiKey?: string) {
    this.decoderService = new DecoderService(apiKey);
    this.apiKey = apiKey || this.decoderService.getRss2JsonApiKey();
  }
  
  // Set the API key
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.decoderService.setApiKey(apiKey);
  }
  
  // Fetch the RSS feed directly using a CORS proxy
  public async fetchNews(): Promise<RssItem[]> {
    try {
      const response = await fetch(`${this.corsProxyUrl}${encodeURIComponent(this.rssUrl)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status}`);
      }
      
      const xmlText = await response.text();
      const items = await this.parseRssFeed(xmlText);
      
      return items;
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
      return [];
    }
  }
  
  // Parse RSS XML content
  private parseRssFeed(xmlText: string): Promise<RssItem[]> {
    return new Promise((resolve, reject) => {
      parseString(xmlText, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        
        try {
          const channel = result.rss.channel[0];
          const items: RssItem[] = channel.item.map((item: any) => {
            // Extract image if available
            let imageUrl = null;
            if (item['media:content'] && item['media:content'][0].$) {
              imageUrl = item['media:content'][0].$.url;
            } else if (item.enclosure && item.enclosure[0].$) {
              imageUrl = item.enclosure[0].$.url;
            }
            
            // Extract content and description
            const content = item['content:encoded'] ? item['content:encoded'][0] : '';
            const description = item.description ? item.description[0] : '';
            
            // If no direct image was found, try to extract from content
            if (!imageUrl && content) {
              const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
              if (imgMatch && imgMatch[1]) {
                imageUrl = imgMatch[1];
              }
            }
            
            // Extract categories
            const categories = item.category ? 
              item.category.map((cat: any) => typeof cat === 'string' ? cat : cat._) : 
              [];
            
            return {
              title: item.title[0],
              link: item.link[0],
              pubDate: item.pubDate[0],
              description: description,
              content: content,
              categories: categories,
              creator: item['dc:creator'] ? item['dc:creator'][0] : '',
              guid: item.guid ? item.guid[0]._ : '',
              imageUrl: imageUrl
            };
          });
          
          resolve(items);
        } catch (error) {
          console.error("Error parsing RSS:", error);
          reject(new Error("Failed to parse RSS feed structure"));
        }
      });
    });
  }
  
  // Group news items by week
  public groupNewsByWeek(items: RssItem[]): Record<string, WeeklyDigest> {
    const weeklyDigests: Record<string, WeeklyDigest> = {};
    
    items.forEach(item => {
      const pubDate = new Date(item.pubDate);
      const weekNumber = this.getWeekNumber(pubDate);
      const year = pubDate.getFullYear();
      const weekKey = `${year}-W${weekNumber}`;
      
      if (!weeklyDigests[weekKey]) {
        weeklyDigests[weekKey] = {
          id: weekKey,
          weekNumber,
          year,
          dateRange: getWeekDateRange(weekNumber, year),
          title: `KI-Update KW ${weekNumber} · ${getWeekDateRange(weekNumber, year)}`,
          summary: `Die wichtigsten KI-Nachrichten der Woche ${weekNumber}`,
          items: [],
          createdAt: new Date()
        };
      }
      
      weeklyDigests[weekKey].items.push(item);
    });
    
    // Sort items within each digest by date
    Object.values(weeklyDigests).forEach(digest => {
      digest.items.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
    });
    
    return weeklyDigests;
  }
  
  // Get the week number for a date
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  
  // Generate a newsletter summary from a weekly digest
  public async generateNewsletterSummary(digest: WeeklyDigest): Promise<string> {
    try {
      // For now, we'll return a mocked response while we implement the real API
      // In a real scenario, we would call an API like OpenAI to generate the content
      const mockNewsletter = this.generateMockNewsletter(digest);
      return mockNewsletter;
    } catch (error) {
      console.error('Error generating newsletter:', error);
      toast.error(`Fehler bei der Generierung des Newsletters: ${(error as Error).message}`);
      return "";
    }
  }
  
  // Generate a mock newsletter (will be replaced with actual API call)
  private generateMockNewsletter(digest: WeeklyDigest): string {
    const { weekNumber, year, dateRange } = digest;
    const items = digest.items.slice(0, 5); // Limit to 5 items for the mock
    
    return `
# 📬 LINKIT WEEKLY
## Dein Update zu KI, Data Science und Industrie 4.0
### KW ${weekNumber} · ${dateRange}

Hey zusammen,

hier ein schneller Überblick über das, was diese Woche Spannendes im KI-Bereich passiert ist – einfach und auf den Punkt gebracht:

${items.map((item, index) => `
### ${item.title}
${item.description.slice(0, 150)}...

👉 [Mehr erfahren](${item.link})
`).join('\n')}

## 🎯 Kurz & Knapp für euch zusammengefasst:
${items.map(item => `- ${item.title.slice(0, 60)}...`).join('\n')}

## 🚀 Du hast Interesse, dich tiefergehend mit spannenden Themen rund um KI, Data Science und Industrie 4.0 zu beschäftigen?

Komm gerne bei einem unserer Mitgliederabende und Veranstaltungen vorbei – wir freuen uns auf dich!

👉 Infos & Termine unter linkit.kit.edu

Euer LINKIT-Team
Hochschulgruppe für Data Science & Industrie 4.0 am KIT
`;
  }
}

export default NewsService;
