
import { v4 as uuidv4 } from 'uuid';
import { LocalNewsletter, NewsletterStorage } from '../types/newsletterTypes';

class LocalNewsletterService implements NewsletterStorage {
  private readonly STORAGE_KEY = 'newsletters_local_storage';
  
  /**
   * Speichert einen Newsletter im localStorage
   */
  public async saveNewsletter(newsletter: LocalNewsletter): Promise<void> {
    const newsletters = await this.getNewsletters();
    
    // Wenn keine ID vorhanden ist, generieren wir eine
    if (!newsletter.id) {
      newsletter.id = uuidv4();
    }
    
    // Wenn sent_at nicht gesetzt ist, setzen wir das aktuelle Datum
    if (!newsletter.sent_at) {
      newsletter.sent_at = new Date().toISOString();
    }
    
    // Newsletter zur Liste hinzufügen
    newsletters.push(newsletter);
    
    // In localStorage speichern
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newsletters));
  }
  
  /**
   * Ruft alle lokal gespeicherten Newsletter ab
   */
  public async getNewsletters(): Promise<LocalNewsletter[]> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    
    if (!data) {
      return [];
    }
    
    try {
      const newsletters = JSON.parse(data) as LocalNewsletter[];
      
      // Nach Datum sortieren (neueste zuerst)
      return newsletters.sort((a, b) => {
        const dateA = new Date(a.sent_at).getTime();
        const dateB = new Date(b.sent_at).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      console.error("Fehler beim Parsen der Newsletter-Daten:", error);
      return [];
    }
  }
  
  /**
   * Löscht alle lokal gespeicherten Newsletter
   */
  public async clearNewsletters(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }
  
  /**
   * Hilfsmethode, um Demo-Daten zu generieren (für Test-Zwecke)
   */
  public async generateDemoData(): Promise<void> {
    const demoNewsletters: LocalNewsletter[] = [
      {
        id: uuidv4(),
        subject: "KI-Newsletter: Neue Entwicklungen bei ChatGPT",
        content: `<div>
          <h2>ChatGPT erhält neue Funktionen</h2>
          <p>OpenAI hat neue Features für ChatGPT angekündigt, darunter verbesserte Bildanalyse und Code-Interpretation.</p>
          <h2>Google veröffentlicht Gemini-Update</h2>
          <p>Google hat sein Gemini-Modell mit neuen Fähigkeiten ausgestattet.</p>
        </div>`,
        sender_name: "KI Newsletter Team",
        sender_email: "newsletter@ki-digest.de",
        sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Eine Woche zurück
        recipients_count: 42
      },
      {
        id: uuidv4(),
        subject: "Die neuesten Trends in künstlicher Intelligenz",
        content: `<div>
          <h2>EU verabschiedet KI-Regularien</h2>
          <p>Die Europäische Union hat neue Regeln für den Einsatz von KI-Systemen beschlossen.</p>
          <h2>Meta präsentiert fortschrittliches Sprachmodell</h2>
          <p>Meta hat ein neues Sprachmodell vorgestellt, das mit GPT-4 konkurrieren soll.</p>
        </div>`,
        sender_name: "KI Newsletter Team",
        sender_email: "newsletter@ki-digest.de",
        sent_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // Zwei Wochen zurück
        recipients_count: 38
      }
    ];
    
    for (const newsletter of demoNewsletters) {
      await this.saveNewsletter(newsletter);
    }
  }
}

export default LocalNewsletterService;
