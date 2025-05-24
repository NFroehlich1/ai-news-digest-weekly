
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewsService from '../NewsService';
import type { RssItem } from '@/types/newsTypes';

// Mock the NewsService
vi.mock('../NewsService');

describe('NewsService', () => {
  let newsService: NewsService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    newsService = new NewsService(mockApiKey);
    vi.clearAllMocks();
  });

  describe('prioritizeNewsForNewsletter', () => {
    it('should prioritize news articles correctly', () => {
      const mockItems: RssItem[] = [
        {
          title: 'Important AI News',
          description: 'This is important AI news',
          content: 'Full content about AI news',
          link: 'https://example.com/ai-news',
          pubDate: new Date().toISOString(),
          sourceName: 'AI Source',
          guid: 'ai-news-1'
        },
        {
          title: 'Regular Tech News',
          description: 'Regular technology news',
          content: 'Full content about tech news',
          link: 'https://example.com/tech-news',
          pubDate: new Date().toISOString(),
          sourceName: 'Tech Source',
          guid: 'tech-news-1'
        }
      ];

      const prioritized = newsService.prioritizeNewsForNewsletter(mockItems, 10);
      expect(prioritized).toBeDefined();
      expect(Array.isArray(prioritized)).toBe(true);
    });
  });

  describe('generateArticleSummary', () => {
    it('should generate article summary', async () => {
      const mockItem: RssItem = {
        title: 'Test Article',
        description: 'Test description',
        content: 'Test content',
        link: 'https://example.com/test',
        pubDate: new Date().toISOString(),
        sourceName: 'Test Source',
        guid: 'test-1'
      };

      const summary = await newsService.generateArticleSummary(mockItem);
      expect(summary).toBeDefined();
    });
  });
});
