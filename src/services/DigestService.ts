
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
    
    // Log filtering operation
    console.log(`Filtering for current week: ${currentWeek}, year: ${currentYear}`);
    console.log(`Total items before filtering: ${items.length}`);
    
    const filteredItems = items.filter(item => {
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      const isCurrentWeek = itemWeek === currentWeek && itemYear === currentYear;
      return isCurrentWeek;
    });
    
    console.log(`Items after filtering for current week: ${filteredItems.length}`);
    return filteredItems;
  }
  
  // Filter news from a specific week
  public filterWeekNews(items: RssItem[], weekNumber: number, year: number): RssItem[] {
    console.log(`Filtering for week: ${weekNumber}, year: ${year}`);
    console.log(`Total items before filtering: ${items.length}`);
    
    const filteredItems = items.filter(item => {
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      const isRequestedWeek = itemWeek === weekNumber && itemYear === year;
      return isRequestedWeek;
    });
    
    console.log(`Items after filtering for specific week: ${filteredItems.length}`);
    return filteredItems;
  }
  
  // Group news items by week
  public groupNewsByWeek(items: RssItem[]): Record<string, WeeklyDigest> {
    console.log(`Grouping ${items.length} news items by week`);
    const weeklyDigests: Record<string, WeeklyDigest> = {};
    
    // Use the current date for items without a publication date
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    items.forEach(item => {
      // If item has no pubDate or invalid date, set it to current date
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        console.log(`Item has no valid pubDate, setting to current date: ${item.title}`);
        item.pubDate = now.toISOString();
      }
      
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
    
    console.log(`Created ${Object.keys(weeklyDigests).length} weekly digests`);
    Object.keys(weeklyDigests).forEach(key => {
      console.log(`Week ${key}: ${weeklyDigests[key].items.length} articles`);
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
