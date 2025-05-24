
import type { RssItem, WeeklyDigest } from '../types/newsTypes';
import { getWeekNumber, getWeekDateRange } from '../utils/dateUtils';

/**
 * Service for managing weekly news digests with improved week coverage
 */
class DigestService {
  constructor() {}
  
  // Filter news to only current week with intelligent fallback
  public filterCurrentWeekNews(items: RssItem[]): RssItem[] {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    // Log filtering operation
    console.log(`Filtering for current week: ${currentWeek}, year: ${currentYear}`);
    console.log(`Total items before filtering: ${items.length}`);
    
    const filteredItems = items.filter(item => {
      // Handle articles without valid dates by assigning them to current week
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        console.log(`Article without valid date assigned to current week: ${item.title}`);
        item.pubDate = now.toISOString();
        return true;
      }
      
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      const isCurrentWeek = itemWeek === currentWeek && itemYear === currentYear;
      
      if (!isCurrentWeek) {
        console.log(`Article filtered out - Week ${itemWeek}/${itemYear} vs Current ${currentWeek}/${currentYear}: ${item.title}`);
      }
      
      return isCurrentWeek;
    });
    
    console.log(`Items after filtering for current week: ${filteredItems.length}`);
    
    // If we don't have enough articles for current week, include previous week
    if (filteredItems.length < 10) {
      console.log(`Not enough current week articles (${filteredItems.length}), including previous week`);
      const previousWeekItems = this.filterPreviousWeekNews(items, currentWeek, currentYear);
      const combinedItems = [...filteredItems, ...previousWeekItems];
      console.log(`Combined current + previous week articles: ${combinedItems.length}`);
      return combinedItems;
    }
    
    return filteredItems;
  }
  
  // Helper method to get previous week articles
  private filterPreviousWeekNews(items: RssItem[], currentWeek: number, currentYear: number): RssItem[] {
    let previousWeek = currentWeek - 1;
    let previousYear = currentYear;
    
    // Handle year boundary
    if (previousWeek <= 0) {
      previousWeek = 52; // Approximate, actual calculation might vary
      previousYear = currentYear - 1;
    }
    
    return items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return false;
      }
      
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      return itemWeek === previousWeek && itemYear === previousYear;
    });
  }
  
  // Filter news from a specific week with better error handling
  public filterWeekNews(items: RssItem[], weekNumber: number, year: number): RssItem[] {
    console.log(`Filtering for week: ${weekNumber}, year: ${year}`);
    console.log(`Total items before filtering: ${items.length}`);
    
    const filteredItems = items.filter(item => {
      // Handle articles without valid dates
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        console.log(`Article without valid date skipped for specific week filter: ${item.title}`);
        return false;
      }
      
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      const isRequestedWeek = itemWeek === weekNumber && itemYear === year;
      return isRequestedWeek;
    });
    
    console.log(`Items after filtering for specific week: ${filteredItems.length}`);
    return filteredItems;
  }
  
  // Group news items by week with improved handling
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
    
    // Sort items within each digest by date (newest first)
    Object.values(weeklyDigests).forEach(digest => {
      digest.items.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      
      // Update summary with actual article count
      digest.summary = `${digest.items.length} wichtige KI-Nachrichten der Woche ${digest.weekNumber}`;
    });
    
    console.log(`Created ${Object.keys(weeklyDigests).length} weekly digests`);
    Object.keys(weeklyDigests).forEach(key => {
      console.log(`Week ${key}: ${weeklyDigests[key].items.length} articles`);
    });
    
    return weeklyDigests;
  }
  
  // Get articles that should be cleaned up (older than two weeks for better retention)
  public getOldArticles(items: RssItem[]): RssItem[] {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14); // Changed from 7 to 14 days
    
    return items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return false; // Don't clean up articles without valid dates
      }
      
      const pubDate = new Date(item.pubDate);
      return pubDate < twoWeeksAgo;
    });
  }
}

export default DigestService;
