
import type { RssItem, WeeklyDigest } from '../types/newsTypes';
import { getWeekNumber, getWeekDateRange } from '../utils/dateUtils';

/**
 * Service for managing weekly news digests with guaranteed comprehensive coverage
 */
class DigestService {
  constructor() {}
  
  // Massively enhanced current week filtering to guarantee minimum 30-50 articles
  public filterCurrentWeekNews(items: RssItem[]): RssItem[] {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    console.log(`=== COMPREHENSIVE WEEK FILTERING START ===`);
    console.log(`Target week: ${currentWeek}, year: ${currentYear}`);
    console.log(`Input articles: ${items.length}`);
    
    // Step 1: Filter exact current week articles
    const currentWeekItems = items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        console.log(`Article without valid date assigned to current week: ${item.title}`);
        item.pubDate = now.toISOString();
        return true;
      }
      
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      return itemWeek === currentWeek && itemYear === currentYear;
    });
    
    console.log(`Step 1 - Current week articles: ${currentWeekItems.length}`);
    
    // Step 2: If we don't have enough, be MUCH more aggressive
    if (currentWeekItems.length < 30) {
      console.log(`=== AGGRESSIVE EXPANSION MODE ACTIVATED ===`);
      console.log(`Current articles insufficient (${currentWeekItems.length}), expanding search...`);
      
      // Include last 14 days regardless of week boundaries
      const last14Days = this.filterByDays(items, 14);
      console.log(`Last 14 days: ${last14Days.length} articles`);
      
      // Include previous week
      const previousWeek = this.filterPreviousWeekNews(items, currentWeek, currentYear);
      console.log(`Previous week: ${previousWeek.length} articles`);
      
      // If still not enough, expand to 21 days
      let expandedItems: RssItem[] = [];
      if (currentWeekItems.length + last14Days.length + previousWeek.length < 40) {
        expandedItems = this.filterByDays(items, 21);
        console.log(`Expanded to 21 days: ${expandedItems.length} articles`);
      }
      
      // Combine all sources and remove duplicates
      const allSources = [currentWeekItems, last14Days, previousWeek, expandedItems];
      const combined = this.mergeAndDeduplicateArticles(allSources);
      
      console.log(`=== FINAL COMPREHENSIVE RESULT ===`);
      console.log(`Combined and deduplicated: ${combined.length} articles`);
      
      // Return at least 50 articles if available, up to 100
      const finalResult = combined.slice(0, 100);
      console.log(`Final return: ${finalResult.length} articles`);
      
      return finalResult;
    }
    
    console.log(`=== STANDARD FILTERING RESULT ===`);
    console.log(`Returning ${currentWeekItems.length} current week articles`);
    
    return currentWeekItems.sort((a, b) => 
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
  }
  
  // New helper: Filter articles by number of days back
  private filterByDays(items: RssItem[], days: number): RssItem[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filtered = items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return true; // Include articles without dates
      }
      
      const pubDate = new Date(item.pubDate);
      return pubDate >= cutoffDate;
    });
    
    console.log(`Filter by ${days} days: ${filtered.length} articles (cutoff: ${cutoffDate.toISOString()})`);
    return filtered;
  }
  
  // Enhanced previous week filtering
  private filterPreviousWeekNews(items: RssItem[], currentWeek: number, currentYear: number): RssItem[] {
    let previousWeek = currentWeek - 1;
    let previousYear = currentYear;
    
    if (previousWeek <= 0) {
      previousWeek = 52;
      previousYear = currentYear - 1;
    }
    
    const filtered = items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return false;
      }
      
      const pubDate = new Date(item.pubDate);
      const itemWeek = getWeekNumber(pubDate);
      const itemYear = pubDate.getFullYear();
      
      return itemWeek === previousWeek && itemYear === previousYear;
    });
    
    console.log(`Previous week ${previousWeek}/${previousYear}: ${filtered.length} articles`);
    return filtered;
  }
  
  // Advanced merge and deduplication
  private mergeAndDeduplicateArticles(articleArrays: RssItem[][]): RssItem[] {
    const seen = new Set<string>();
    const merged: RssItem[] = [];
    
    // Flatten all arrays and deduplicate
    articleArrays.forEach(array => {
      array.forEach(item => {
        const key = this.generateArticleKey(item);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      });
    });
    
    // Sort by date (newest first)
    merged.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    console.log(`Merged and deduplicated: ${merged.length} unique articles`);
    return merged;
  }
  
  // Generate unique key for article deduplication
  private generateArticleKey(item: RssItem): string {
    const normalizedUrl = item.link.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '');
    const normalizedTitle = item.title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    return `${normalizedUrl}|${normalizedTitle}`;
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
      
      return itemWeek === weekNumber && itemYear === year;
    });
    
    console.log(`Specific week result: ${filteredItems.length} articles`);
    return filteredItems.sort((a, b) => 
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
  }
  
  // Enhanced weekly grouping
  public groupNewsByWeek(items: RssItem[]): Record<string, WeeklyDigest> {
    console.log(`=== ENHANCED WEEKLY GROUPING ===`);
    console.log(`Input items: ${items.length}`);
    
    const weeklyDigests: Record<string, WeeklyDigest> = {};
    const now = new Date();
    
    items.forEach((item, index) => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        console.log(`Item ${index + 1} - Invalid date, setting to now: ${item.title}`);
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
          summary: `KI-Nachrichten der Woche ${weekNumber}`,
          items: [],
          createdAt: new Date()
        };
      }
      
      weeklyDigests[weekKey].items.push(item);
    });
    
    // Process each digest
    Object.values(weeklyDigests).forEach(digest => {
      // Remove duplicates within digest
      const uniqueItems = digest.items.filter((item, index, array) => 
        array.findIndex(other => this.generateArticleKey(other) === this.generateArticleKey(item)) === index
      );
      
      digest.items = uniqueItems.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      
      digest.summary = `${digest.items.length} KI-Nachrichten der Woche ${digest.weekNumber}`;
      
      console.log(`Week ${digest.id}: ${digest.items.length} articles`);
    });
    
    console.log(`=== GROUPING COMPLETE ===`);
    console.log(`Created ${Object.keys(weeklyDigests).length} weekly digests`);
    
    return weeklyDigests;
  }
  
  // Old article cleanup - more conservative for comprehensive coverage
  public getOldArticles(items: RssItem[]): RssItem[] {
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21); // Changed to 21 days
    
    return items.filter(item => {
      if (!item.pubDate || isNaN(new Date(item.pubDate).getTime())) {
        return false;
      }
      
      const pubDate = new Date(item.pubDate);
      return pubDate < threeWeeksAgo;
    });
  }
}

export default DigestService;
