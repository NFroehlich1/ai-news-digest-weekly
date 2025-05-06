
import { RssSource } from '../types/newsTypes';
import { toast } from "sonner";
import { DEFAULT_RSS_SOURCES } from '../data/mockNews';

/**
 * Service for managing RSS sources
 */
class RssSourceService {
  private rssSources: RssSource[] = [];
  
  constructor() {
    this.loadRssSources();
  }
  
  // Load RSS sources from localStorage
  private loadRssSources(): void {
    try {
      const savedSources = localStorage.getItem('rss_sources');
      
      // If no sources saved, initialize with defaults plus additional AI news sources
      if (!savedSources) {
        const additionalSources: RssSource[] = [
          {
            name: "Heise KI-News",
            url: "https://www.heise.de/thema/kuenstliche_intelligenz/feed/",
            enabled: true
          },
          {
            name: "t3n KI-News",
            url: "https://t3n.de/tag/kuenstliche-intelligenz/feed/",
            enabled: true
          },
          {
            name: "Golem KI-News",
            url: "https://rss.golem.de/rss.php?feed=RSS2.0",
            enabled: true
          },
          {
            name: "Netzpolitik KI",
            url: "https://netzpolitik.org/category/ki/feed/",
            enabled: true
          }
        ];
        
        this.rssSources = [...DEFAULT_RSS_SOURCES, ...additionalSources];
        this.saveRssSources();
      } else {
        this.rssSources = JSON.parse(savedSources);
      }
    } catch (error) {
      console.error("Error loading RSS sources:", error);
      this.rssSources = [...DEFAULT_RSS_SOURCES];
      this.saveRssSources();
    }
  }
  
  // Save RSS sources to localStorage
  private saveRssSources(): void {
    try {
      localStorage.setItem('rss_sources', JSON.stringify(this.rssSources));
    } catch (error) {
      console.error("Error saving RSS sources:", error);
      toast.error("Fehler beim Speichern der RSS-Quellen");
    }
  }
  
  // Get all RSS sources
  public getRssSources(): RssSource[] {
    return [...this.rssSources];
  }
  
  // Add a new RSS source
  public addRssSource(url: string, name: string): boolean {
    // Basic URL validation
    try {
      new URL(url);
    } catch (error) {
      toast.error("Ungültige URL");
      return false;
    }
    
    // Check if source already exists
    if (this.rssSources.some(source => source.url === url)) {
      toast.error("Diese RSS-Quelle existiert bereits");
      return false;
    }
    
    this.rssSources.push({
      url,
      name: name || new URL(url).hostname,
      enabled: true
    });
    
    this.saveRssSources();
    toast.success(`Neue RSS-Quelle "${name || new URL(url).hostname}" hinzugefügt`);
    return true;
  }
  
  // Remove an RSS source
  public removeRssSource(url: string): boolean {
    const initialLength = this.rssSources.length;
    this.rssSources = this.rssSources.filter(source => source.url !== url);
    
    if (this.rssSources.length < initialLength) {
      this.saveRssSources();
      toast.success("RSS-Quelle entfernt");
      return true;
    }
    
    return false;
  }
  
  // Toggle RSS source enabled/disabled state
  public toggleRssSource(url: string, enabled: boolean): boolean {
    const source = this.rssSources.find(source => source.url === url);
    if (source) {
      source.enabled = enabled;
      this.saveRssSources();
      return true;
    }
    return false;
  }
}

export default RssSourceService;
