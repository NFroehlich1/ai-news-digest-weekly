import type { RssItem, WeeklyDigest } from '../types/newsTypes';
import { getWeekNumber, getWeekDateRange } from '../utils/dateUtils';

/**
 * Service for managing weekly news digests with strict current week focus
 */
class DigestService {
  constructor() {}
  
  // Strict current week filtering - no aggressive fallbacks
  public filterCurrentWeekNews(items: RssItem[]): RssItem[] {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    console.log(`=== STRICT CURRENT WEEK FILTERING ===`);
    console.log(`Target week: ${currentWeek}, year: ${currentYear}`);
    console.log(`Input articles: ${items.length}`);
    
    // Get week boundaries
    const weekStart = this.getWeekStart(now);
    const weekEnd = this.getWeekEnd(now);
    
    console.log(`Week boundaries: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
    
    // Filter articles strictly within current week
    const currentWeekItems = items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        console.log(`Article rejected - invalid date: ${item.title}`);
        return false; // Strict: reject articles without valid dates
      }
      
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      // Check if article is in current week
      const isCurrentWeek = itemWeek === currentWeek && itemYear === currentYear;
      const isWithinBoundaries = pubDate >= weekStart && pubDate <= weekEnd;
      
      if (!isCurrentWeek || !isWithinBoundaries) {
        console.log(`Article rejected - wrong week: ${item.title} (Week ${itemWeek}/${itemYear}, Date: ${pubDate.toISOString()})`);
        return false;
      }
      
      console.log(`✅ Article accepted: ${item.title} (${pubDate.toISOString()})`);
      return true;
    });
    
    console.log(`=== STRICT FILTERING RESULT ===`);
    console.log(`Current week articles: ${currentWeekItems.length}`);
    
    // Sort by date (newest first)
    const sortedItems = currentWeekItems.sort((a, b) => 
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
    
    console.log(`Final sorted result: ${sortedItems.length} articles`);
    return sortedItems;
  }
  
  // Get start of current week (Monday 00:00:00)
  private getWeekStart(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  
  // Get end of current week (Sunday 23:59:59)
  private getWeekEnd(date: Date): Date {
    const end = new Date(date);
    const day = end.getDay();
    const diff = end.getDate() - day + (day === 0 ? 0 : 7); // Sunday as end
    end.setDate(diff);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  
  // Enhanced specific week filtering
  public filterWeekNews(items: RssItem[], weekNumber: number, year: number): RssItem[] {
    console.log(`=== SPECIFIC WEEK FILTERING ===`);
    console.log(`Target: Week ${weekNumber}, ${year}`);
    console.log(`Input articles: ${items.length}`);
    
    const filteredItems = items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return false; // Strict for specific week requests
      }
      
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      const isTargetWeek = itemWeek === weekNumber && itemYear === year;
      
      if (isTargetWeek) {
        console.log(`✅ Week ${weekNumber} article: ${item.title}`);
      }
      
      return isTargetWeek;
    });
    
    console.log(`Specific week result: ${filteredItems.length} articles`);
    return filteredItems.sort((a, b) => 
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
  }
  
  // Enhanced weekly grouping with strict date validation
  public groupNewsByWeek(items: RssItem[]): Record<string, WeeklyDigest> {
    console.log(`=== ENHANCED WEEKLY GROUPING ===`);
    console.log(`Input items: ${items.length}`);
    
    const weeklyDigests: Record<string, WeeklyDigest> = {};
    let validArticlesCount = 0;
    let invalidArticlesCount = 0;
    
    items.forEach((item, index) => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        console.log(`Item ${index + 1} - Invalid date, skipping: ${item.title}`);
        invalidArticlesCount++;
        return; // Skip articles without valid dates
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
          summary: `KI-Nachrichten der Woche ${weekNumber}`,
          items: [],
          createdAt: new Date()
        };
      }
      
      weeklyDigests[weekKey].items.push(item);
      validArticlesCount++;
      console.log(`✅ Added to ${weekKey}: ${item.title} (${pubDate.toISOString()})`);
    });
    
    // Process each digest
    Object.values(weeklyDigests).forEach(digest => {
      // Remove duplicates within digest
      const uniqueItems = digest.items.filter((item, index, array) => 
        array.findIndex(other => 
          other.link.toLowerCase() === item.link.toLowerCase() ||
          other.title.toLowerCase() === item.title.toLowerCase()
        ) === index
      );
      
      digest.items = uniqueItems.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      
      digest.summary = `${digest.items.length} KI-Nachrichten der Woche ${digest.weekNumber}`;
      
      console.log(`Week ${digest.id}: ${digest.items.length} unique articles`);
    });
    
    console.log(`=== GROUPING COMPLETE ===`);
    console.log(`Valid articles: ${validArticlesCount}, Invalid: ${invalidArticlesCount}`);
    console.log(`Created ${Object.keys(weeklyDigests).length} weekly digests`);
    
    return weeklyDigests;
  }
  
  // Conservative old article cleanup - keep more recent articles
  public getOldArticles(items: RssItem[]): RssItem[] {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28); // Changed to 4 weeks
    
    return items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return false;
      }
      
      const pubDate = new Date(item.pubDate);
      return pubDate < fourWeeksAgo;
    });
  }
}

export default DigestService;
