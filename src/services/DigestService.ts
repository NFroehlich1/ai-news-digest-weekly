
import type { RssItem, WeeklyDigest } from '../types/newsTypes';
import { getWeekNumber, getWeekDateRange } from '../utils/dateUtils';

/**
 * Service for managing weekly news digests with balanced filtering
 */
class DigestService {
  constructor() {}
  
  // Balanced current week filtering - includes recent articles
  public filterCurrentWeekNews(items: RssItem[]): RssItem[] {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    console.log(`=== BALANCED CURRENT WEEK FILTERING ===`);
    console.log(`Target week: ${currentWeek}, year: ${currentYear}`);
    console.log(`Input articles: ${items.length}`);
    
    // Get week boundaries with some flexibility
    const weekStart = this.getWeekStart(now);
    const weekEnd = this.getWeekEnd(now);
    
    // Also include recent articles (last 3 days) even if from previous week
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    console.log(`Week boundaries: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
    console.log(`Including recent articles from: ${threeDaysAgo.toISOString()}`);
    
    // Filter with balanced approach
    const filteredItems = items.filter(item => {
      if (!item.pubDate) {
        // Include articles without date (they're likely recent)
        console.log(`✅ Article accepted (no date, assuming recent): ${item.title}`);
        return true;
      }
      
      const pubDate = new Date(item.pubDate);
      if (isNaN(pubDate.getTime())) {
        // Include articles with invalid dates (assume recent)
        console.log(`✅ Article accepted (invalid date, assuming recent): ${item.title}`);
        return true;
      }
      
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      // Check if article is in current week OR recent (last 3 days)
      const isCurrentWeek = itemWeek === currentWeek && itemYear === currentYear;
      const isRecent = pubDate >= threeDaysAgo;
      
      if (isCurrentWeek || isRecent) {
        console.log(`✅ Article accepted: ${item.title} (Week ${itemWeek}/${itemYear}, Date: ${pubDate.toISOString()})`);
        return true;
      }
      
      console.log(`❌ Article rejected - too old: ${item.title} (Week ${itemWeek}/${itemYear})`);
      return false;
    });
    
    console.log(`=== BALANCED FILTERING RESULT ===`);
    console.log(`Filtered articles: ${filteredItems.length}`);
    
    // Sort by date (newest first)
    const sortedItems = filteredItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : Date.now();
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : Date.now();
      return dateB - dateA;
    });
    
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
  
  // Specific week filtering (kept for compatibility)
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
  
  // Enhanced weekly grouping with balanced approach
  public groupNewsByWeek(items: RssItem[]): Record<string, WeeklyDigest> {
    console.log(`=== BALANCED WEEKLY GROUPING ===`);
    console.log(`Input items: ${items.length}`);
    
    const weeklyDigests: Record<string, WeeklyDigest> = {};
    let validArticlesCount = 0;
    let noDateArticlesCount = 0;
    
    items.forEach((item, index) => {
      let pubDate: Date;
      let weekNumber: number;
      let year: number;
      
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        // For articles without valid dates, use current week
        pubDate = new Date();
        weekNumber = getWeekNumber(pubDate);
        year = pubDate.getFullYear();
        noDateArticlesCount++;
        console.log(`Item ${index + 1} - No valid date, using current week: ${item.title}`);
      } else {
        pubDate = new Date(item.pubDate);
        weekNumber = getWeekNumber(pubDate);
        year = pubDate.getFullYear();
        validArticlesCount++;
      }
      
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
      console.log(`✅ Added to ${weekKey}: ${item.title}`);
    });
    
    // Process each digest
    Object.values(weeklyDigests).forEach(digest => {
      // Remove duplicates within digest
      const uniqueItems = digest.items.filter((item, index, array) => 
        array.findIndex(other => 
          other.link.toLowerCase() === item.link.toLowerCase()
        ) === index
      );
      
      digest.items = uniqueItems.sort((a, b) => {
        const dateA = a.pubDate ? new Date(a.pubDate).getTime() : Date.now();
        const dateB = b.pubDate ? new Date(b.pubDate).getTime() : Date.now();
        return dateB - dateA;
      });
      
      digest.summary = `${digest.items.length} KI-Nachrichten der Woche ${digest.weekNumber}`;
      
      console.log(`Week ${digest.id}: ${digest.items.length} unique articles`);
    });
    
    console.log(`=== GROUPING COMPLETE ===`);
    console.log(`Valid articles: ${validArticlesCount}, No date: ${noDateArticlesCount}`);
    console.log(`Created ${Object.keys(weeklyDigests).length} weekly digests`);
    
    return weeklyDigests;
  }
  
  // Conservative old article cleanup
  public getOldArticles(items: RssItem[]): RssItem[] {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    
    return items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return false;
      }
      
      const pubDate = new Date(item.pubDate);
      return pubDate < oneMonthAgo;
    });
  }
}

export default DigestService;
