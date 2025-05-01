
import type { RssItem, WeeklyDigest } from '../types/newsTypes';
import { getWeekNumber, getWeekDateRange } from '../utils/dateUtils';

/**
 * Service for managing weekly news digests
 */
class DigestService {
  constructor() {}
  
  // Filter news to only current week
  public filterCurrentWeekNews(items: RssItem[]): RssItem[] {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    return items.filter(item => {
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      return itemWeek === currentWeek && itemYear === currentYear;
    });
  }
  
  // Filter news from a specific week
  public filterWeekNews(items: RssItem[], weekNumber: number, year: number): RssItem[] {
    return items.filter(item => {
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      return itemWeek === weekNumber && itemYear === year;
    });
  }
  
  // Group news items by week
  public groupNewsByWeek(items: RssItem[]): Record<string, WeeklyDigest> {
    const weeklyDigests: Record<string, WeeklyDigest> = {};
    
    items.forEach(item => {
      const pubDate = new Date(item.pubDate);
      const weekNumber = getWeekNumber(pubDate);
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
  
  // Get articles that should be cleaned up (older than one week)
  public getOldArticles(items: RssItem[]): RssItem[] {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return items.filter(item => {
      const pubDate = new Date(item.pubDate);
      return pubDate < oneWeekAgo;
    });
  }
}

export default DigestService;
