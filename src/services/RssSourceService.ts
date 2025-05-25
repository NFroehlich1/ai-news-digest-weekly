
import { RssSource } from '../types/newsTypes';
import { toast } from "sonner";

/**
 * Service for managing RSS sources - fokussiert auf The Decoder
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
      
      // Wenn keine Quellen gespeichert sind, nur The Decoder als Standard
      if (!savedSources) {
        this.rssSources = [
          {
            name: "The Decoder - KI News",
            url: "https://the-decoder.de/",
            enabled: true
          }
        ];
        this.saveRssSources();
      } else {
        const parsedSources = JSON.parse(savedSources);
        
        // Falls alte Quellen vorhanden sind, nur The Decoder behalten
        const decoderSources = parsedSources.filter((source: RssSource) => 
          source.url.includes('the-decoder.de')
        );
        
        if (decoderSources.length === 0) {
          this.rssSources = [
            {
              name: "The Decoder - KI News",
              url: "https://the-decoder.de/",
              enabled: true
            }
          ];
        } else {
          this.rssSources = decoderSources;
        }
        
        this.saveRssSources();
      }
    } catch (error) {
      console.error("Error loading RSS sources:", error);
      this.rssSources = [
        {
          name: "The Decoder - KI News",
          url: "https://the-decoder.de/",
          enabled: true
        }
      ];
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
  
  // Get only enabled RSS sources
  public getEnabledRssSources(): RssSource[] {
    return this.rssSources.filter(source => source.enabled);
  }
  
  // Add a new RSS source - only allow The Decoder URLs
  public addRssSource(url: string, name: string): boolean {
    // Basic URL validation
    try {
      new URL(url);
    } catch (error) {
      toast.error("Ungültige URL");
      return false;
    }
    
    // Nur The Decoder URLs erlauben
    if (!url.includes('the-decoder.de')) {
      toast.error("Nur The Decoder URLs sind aktuell unterstützt");
      return false;
    }
    
    // Check if source already exists
    if (this.rssSources.some(source => source.url === url)) {
      toast.error("Diese RSS-Quelle existiert bereits");
      return false;
    }
    
    this.rssSources.push({
      url,
      name: name || "The Decoder",
      enabled: true
    });
    
    this.saveRssSources();
    toast.success(`Neue RSS-Quelle "${name || "The Decoder"}" hinzugefügt`);
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
      toast.success(`RSS-Quelle ${enabled ? 'aktiviert' : 'deaktiviert'}`);
      return true;
    }
    return false;
  }
  
  // Check if any sources are enabled
  public hasEnabledSources(): boolean {
    return this.rssSources.some(source => source.enabled);
  }
  
  // Get source by URL
  public getSourceByUrl(url: string): RssSource | undefined {
    return this.rssSources.find(source => source.url === url);
  }
  
  // Filter sources by name (partial match)
  public filterSourcesByName(name: string): RssSource[] {
    const lowerCaseName = name.toLowerCase();
    return this.rssSources.filter(
      source => source.name.toLowerCase().includes(lowerCaseName)
    );
  }
}

export default RssSourceService;
