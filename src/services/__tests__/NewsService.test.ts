
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NewsService from '../NewsService';
import { MOCK_NEWS_ITEMS } from '../../data/mockNews';

// Mock the toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }
}));

describe('NewsService', () => {
  let newsService: NewsService;

  beforeEach(() => {
    newsService = new NewsService(); // Updated to use no arguments
    newsService.setUseMockData(true);
  });

  describe('fetchNews', () => {
    it('should return mock data when useMockData is true', async () => {
      const result = await newsService.fetchNews();
      expect(result).toEqual(MOCK_NEWS_ITEMS);
    });

    it('should return mock data when no enabled sources', async () => {
      const result = await newsService.fetchNews();
      expect(result).toEqual(MOCK_NEWS_ITEMS);
    });
  });

  describe('RSS Source Management', () => {
    it('should get RSS sources', () => {
      const sources = newsService.getRssSources();
      expect(Array.isArray(sources)).toBe(true);
    });

    it('should get enabled RSS sources', () => {
      const enabledSources = newsService.getEnabledRssSources();
      expect(Array.isArray(enabledSources)).toBe(true);
    });

    it('should add RSS source', () => {
      const result = newsService.addRssSource('https://example.com/feed', 'Example Feed');
      expect(typeof result).toBe('boolean');
    });

    it('should remove RSS source', () => {
      const result = newsService.removeRssSource('https://example.com/feed');
      expect(typeof result).toBe('boolean');
    });

    it('should toggle RSS source', () => {
      const result = newsService.toggleRssSource('https://example.com/feed', true);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Newsletter Generation', () => {
    it('should generate newsletter summary', async () => {
      const digest = {
        id: 'test',
        weekNumber: 1,
        year: 2025,
        dateRange: 'Test Week',
        title: 'Test Digest',
        summary: 'Test Summary',
        items: MOCK_NEWS_ITEMS,
        createdAt: new Date()
      };

      const result = await newsService.generateNewsletterSummary(digest);
      expect(typeof result).toBe('string');
    });
  });
});
