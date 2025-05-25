import type { RssItem, WeeklyDigest } from '../types/newsTypes';
import { getWeekNumber, getWeekDateRange } from '../utils/dateUtils';

/**
 * Service for managing weekly news digests with cumulative daily collection
 */
class DigestService {
  constructor() {}
  
  // Enhanced current week filtering - accumulates articles throughout the week
  public filterCurrentWeekNews(items: RssItem[]): RssItem[] {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    console.log(`=== CUMULATIVE WEEKLY FILTERING ===`);
    console.log(`Target week: ${currentWeek}, year: ${currentYear}`);
    console.log(`Input articles: ${items.length}`);
    
    // Get week boundaries - full week Monday to Sunday
    const weekStart = this.getWeekStart(now);
    const weekEnd = this.getWeekEnd(now);
    
    console.log(`Week boundaries: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
    
    // Filter articles from current week with cumulative approach
    const filteredItems = items.filter(item => {
      if (!item.pubDate) {
        // Include articles without date (likely recent)
        console.log(`✅ Article accepted (no date): ${item.title}`);
        return true;
      }
      
      const pubDate = new Date(item.pubDate);
      if (isNaN(pubDate.getTime())) {
        // Include articles with invalid dates
        console.log(`✅ Article accepted (invalid date): ${item.title}`);
        return true;
      }
      
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      // Include all articles from current week (Monday to today)
      const isCurrentWeek = itemWeek === currentWeek && itemYear === currentYear;
      const isWithinWeekBounds = pubDate >= weekStart && pubDate <= now;
      
      if (isCurrentWeek && isWithinWeekBounds) {
        console.log(`✅ Article accepted - current week: ${item.title} (${pubDate.toISOString()})`);
        return true;
      }
      
      console.log(`❌ Article rejected - outside current week: ${item.title} (Week ${itemWeek}/${itemYear})`);
      return false;
    });
    
    console.log(`=== CUMULATIVE FILTERING RESULT ===`);
    console.log(`Articles in current week: ${filteredItems.length}`);
    
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
  
  // Daily article accumulation - adds new articles to existing collection
  public accumulateWeeklyNews(existingItems: RssItem[], newItems: RssItem[]): RssItem[] {
    console.log(`=== DAILY ACCUMULATION ===`);
    console.log(`Existing articles: ${existingItems.length}`);
    console.log(`New articles: ${newItems.length}`);
    
    // Create a map to avoid duplicates
    const articleMap = new Map<string, RssItem>();
    
    // Add existing articles first
    existingItems.forEach(item => {
      const id = item.guid || item.link;
      articleMap.set(id, item);
    });
    
    // Add new articles (overwrites if same ID)
    newItems.forEach(item => {
      const id = item.guid || item.link;
      if (!articleMap.has(id)) {
        articleMap.set(id, item);
        console.log(`✅ New article added: ${item.title}`);
      } else {
        console.log(`⚡ Article already exists: ${item.title}`);
      }
    });
    
    const accumulatedItems = Array.from(articleMap.values());
    
    // Sort by date (newest first)
    accumulatedItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : Date.now();
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : Date.now();
      return dateB - dateA;
    });
    
    console.log(`Total accumulated articles: ${accumulatedItems.length}`);
    return accumulatedItems;
  }
  
  // Specific week filtering (kept for compatibility)
  public filterWeekNews(items: RssItem[], weekNumber: number, year: number): RssItem[] {
    console.log(`=== SPECIFIC WEEK FILTERING ===`);
    console.log(`Target: Week ${weekNumber}, ${year}`);
    console.log(`Input articles: ${items.length}`);
    
    const filteredItems = items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return false;
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
  
  // Enhanced weekly grouping with cumulative approach
  public groupNewsByWeek(items: RssItem[]): Record<string, WeeklyDigest> {
    console.log(`=== CUMULATIVE WEEKLY GROUPING ===`);
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
          title: `LINKIT WEEKLY KW ${weekNumber} · ${getWeekDateRange(weekNumber, year)}`,
          summary: `KI-Nachrichten der Woche ${weekNumber} - Detaillierte Analyse`,
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
          (other.guid || other.link) === (item.guid || item.link)
        ) === index
      );
      
      digest.items = uniqueItems.sort((a, b) => {
        const dateA = a.pubDate ? new Date(a.pubDate).getTime() : Date.now();
        const dateB = b.pubDate ? new Date(b.pubDate).getTime() : Date.now();
        return dateB - dateA;
      });
      
      digest.summary = `${digest.items.length} KI-Nachrichten der Woche ${digest.weekNumber} - Umfassende Analyse und Einblicke`;
      
      console.log(`Week ${digest.id}: ${digest.items.length} unique articles`);
    });
    
    console.log(`=== GROUPING COMPLETE ===`);
    console.log(`Valid articles: ${validArticlesCount}, No date: ${noDateArticlesCount}`);
    console.log(`Created ${Object.keys(weeklyDigests).length} weekly digests`);
    
    return weeklyDigests;
  }
  
  // Weekly cleanup - only removes articles older than one week on Sunday
  public shouldCleanupWeek(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    return dayOfWeek === 0; // Only cleanup on Sunday
  }
  
  public cleanupOldWeek(digests: Record<string, WeeklyDigest>): Record<string, WeeklyDigest> {
    if (!this.shouldCleanupWeek()) {
      console.log("⏭️ Not Sunday - skipping weekly cleanup");
      return digests;
    }
    
    console.log("🧹 Sunday cleanup - removing old articles");
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const cleanedDigests = { ...digests };
    
    Object.keys(cleanedDigests).forEach(key => {
      const digest = cleanedDigests[key];
      
      // Filter items to keep only those newer than one week
      const oldCount = digest.items.length;
      digest.items = digest.items.filter(item => {
        if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
          return true; // Keep articles without valid dates
        }
        
        const pubDate = new Date(item.pubDate);
        return pubDate >= oneWeekAgo;
      });
      
      const newCount = digest.items.length;
      if (oldCount !== newCount) {
        console.log(`Cleaned week ${key}: ${oldCount} → ${newCount} articles`);
      }
    });
    
    // Remove empty digests
    Object.keys(cleanedDigests).forEach(key => {
      if (cleanedDigests[key].items.length === 0) {
        console.log(`Removing empty digest: ${key}`);
        delete cleanedDigests[key];
      }
    });
    
    return cleanedDigests;
  }
}

export default DigestService;
