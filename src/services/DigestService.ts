import type { RssItem, WeeklyDigest } from '../types/newsTypes';
import { getWeekNumber, getWeekDateRange } from '../utils/dateUtils';

/**
 * Service for managing weekly news digests with comprehensive week coverage
 */
class DigestService {
  constructor() {}
  
  // Enhanced current week filtering with much more aggressive coverage strategy
  public filterCurrentWeekNews(items: RssItem[]): RssItem[] {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    console.log(`Comprehensive filtering for current week: ${currentWeek}, year: ${currentYear}`);
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
        console.log(`Article from different week - Week ${itemWeek}/${itemYear}: ${item.title}`);
      }
      
      return isCurrentWeek;
    });
    
    console.log(`Items after current week filtering: ${filteredItems.length}`);
    
    // Much more aggressive fallback strategy - we want 40+ articles minimum
    if (filteredItems.length < 40) {
      console.log(`Insufficient current week articles (${filteredItems.length}), implementing aggressive comprehensive fallback`);
      
      // Include previous week
      const previousWeekItems = this.filterPreviousWeekNews(items, currentWeek, currentYear);
      console.log(`Previous week articles found: ${previousWeekItems.length}`);
      
      // Include articles from last 14 days regardless of week boundaries
      const recentItems = this.filterRecentDaysNews(items, 14);
      console.log(`Recent 14-day items found: ${recentItems.length}`);
      
      // If still not enough, expand to 21 days
      let extendedRecentItems: RssItem[] = [];
      const combinedItems = [...filteredItems, ...previousWeekItems, ...recentItems];
      
      if (combinedItems.length < 35) {
        console.log(`Still insufficient articles (${combinedItems.length}), expanding to 21 days`);
        extendedRecentItems = this.filterRecentDaysNews(items, 21);
        console.log(`Extended 21-day items found: ${extendedRecentItems.length}`);
      }
      
      // Merge and deduplicate all sources
      const itemMap = new Map<string, RssItem>();
      [...filteredItems, ...previousWeekItems, ...recentItems, ...extendedRecentItems].forEach(item => {
        const key = item.link || item.title;
        if (!itemMap.has(key)) {
          itemMap.set(key, item);
        }
      });
      
      const allRecentItems = Array.from(itemMap.values());
      console.log(`After aggressive comprehensive fallback: ${allRecentItems.length} articles`);
      
      // Sort by date (newest first) and return more articles
      const sortedItems = allRecentItems.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      
      return sortedItems.slice(0, 80); // Significantly increased limit for comprehensive coverage
    }
    
    return filteredItems.sort((a, b) => 
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
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
  
  // Filter articles from recent days regardless of week boundaries
  private filterRecentDaysNews(items: RssItem[], days: number): RssItem[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return true;
      }
      
      const pubDate = new Date(item.pubDate);
      return pubDate >= cutoffDate;
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
