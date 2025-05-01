
/**
 * Types for RSS feeds and news data
 */

// Item in an RSS feed
export type RssItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content: string;
  categories?: string[];
  creator?: string;
  guid?: string;
  imageUrl?: string;
  sourceUrl?: string; // Added to track source
  sourceName?: string; // Added to track source name
  aiSummary?: string; // Added for AI-generated summary
  isLoading?: boolean; // Added to track loading state
  isOpen?: boolean; // Added to track expanded state
};

// RSS feed source configuration
export type RssSource = {
  url: string;
  name: string;
  enabled: boolean;
  lastFetched?: Date;
};

// Weekly news digest
export type WeeklyDigest = {
  id: string;
  weekNumber: number;
  year: number;
  dateRange: string;
  title: string;
  summary: string;
  items: RssItem[];
  generatedContent?: string;
  createdAt: Date;
};
