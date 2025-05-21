import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewsService from '../NewsService';
import DecoderService from '../DecoderService'; // Import to mock
import type { RssItem, WeeklyDigest } from '@/types/newsTypes';

// Mock DecoderService
// We need to mock it BEFORE NewsService is imported if NewsService instantiates it at the module level or in constructor
vi.mock('../DecoderService');

describe('NewsService', () => {
  let newsService: NewsService;
  let mockDecoderServiceInstance: InstanceType<typeof DecoderService>;

  const mockApiKey = 'test-news-api-key';

  beforeEach(() => {
    // Create a new mock instance for each test
    // Vitest's vi.mock hoists, so DecoderService is already the mocked constructor.
    // We can get the instance from the mock's internal store if needed, or just rely on the prototype mock.
    // For spying on a method of an instance created by another class,
    // we often need to ensure the instance uses the mocked method.

    // Reset all mocks to clear call history etc.
    vi.clearAllMocks();

    // Since NewsService creates its own DecoderService instance,
    // we need to ensure that the generateSummary method on *that instance* is a spy.
    // The easiest way with vi.mock is to mock the prototype.
    const mockGenerateSummary = vi.fn().mockResolvedValue('Mocked Summary');
    DecoderService.prototype.generateSummary = mockGenerateSummary;
    DecoderService.prototype.verifyApiKey = vi.fn().mockResolvedValue({isValid: true, message: 'mock valid'});


    newsService = new NewsService(mockApiKey);

    // It's a bit tricky to get the *actual* instance of DecoderService
    // that newsService created if it's private.
    // However, by mocking DecoderService.prototype.generateSummary,
    // any new instance of DecoderService created by NewsService will use this mocked method.
    // So we can just check `DecoderService.prototype.generateSummary`.
    mockDecoderServiceInstance = {} as any; // We don't really need the instance itself if we mock the prototype
  });

  describe('generateNewsletterSummary', () => {
    it('should call decoderService.generateSummary with correct arguments including linkedInPage and selected articles', async () => {
      const mockDigest: WeeklyDigest = {
        id: '2023-W42',
        weekNumber: 42,
        year: 2023,
        dateRange: 'Oct 16 - Oct 22',
        title: 'Tech News Weekly',
        summary: 'Digest of tech news',
        items: [
          { title: 'Article 1', description: 'Desc 1', link: 'http://example.com/1', pubDate: new Date().toISOString(), sourceName: 'Source1', guid: 'g1' },
          { title: 'Article 2', description: 'Desc 2', link: 'http://example.com/2', pubDate: new Date().toISOString(), sourceName: 'Source2', guid: 'g2' },
        ],
        createdAt: new Date(),
      };
      const mockSelectedArticles: RssItem[] = [mockDigest.items[0]]; // Select only the first article
      const mockLinkedInPage = 'https://linkedin.com/company/newsletter';

      // Spy on prioritizeNewsForNewsletter to ensure it's NOT called when selectedArticles are provided
      const prioritizeSpy = vi.spyOn(newsService, 'prioritizeNewsForNewsletter');

      await newsService.generateNewsletterSummary(mockDigest, mockSelectedArticles, mockLinkedInPage);

      expect(prioritizeSpy).not.toHaveBeenCalled();
      expect(DecoderService.prototype.generateSummary).toHaveBeenCalledTimes(1);
      expect(DecoderService.prototype.generateSummary).toHaveBeenCalledWith(
        mockDigest,
        mockSelectedArticles, // Should pass the selected articles
        mockLinkedInPage
      );
    });

    it('should call decoderService.generateSummary with prioritized articles if no selectedArticles are provided', async () => {
      const mockDigest: WeeklyDigest = {
        id: '2023-W43',
        weekNumber: 43,
        year: 2023,
        dateRange: 'Oct 23 - Oct 29',
        title: 'AI Advances',
        summary: 'Latest in AI',
        items: [
          { title: 'AI Article 1', description: 'AI Desc 1', link: 'http://example.com/ai1', pubDate: new Date().toISOString(), sourceName: 'AISource1', guid: 'gai1' },
          { title: 'AI Article 2', description: 'AI Desc 2', link: 'http://example.com/ai2', pubDate: new Date().toISOString(), sourceName: 'AISource2', guid: 'gai2' },
        ],
        createdAt: new Date(),
      };
      const mockLinkedInPage = 'https://linkedin.com/company/newsletter-ai';
      
      // Mock prioritizeNewsForNewsletter to return a specific set of articles
      const prioritizedMockArticles = [mockDigest.items[1]]; // e.g., returns the second article
      const prioritizeSpy = vi.spyOn(newsService, 'prioritizeNewsForNewsletter').mockReturnValue(prioritizedMockArticles);

      await newsService.generateNewsletterSummary(mockDigest, undefined, mockLinkedInPage); // Pass undefined for selectedArticles

      expect(prioritizeSpy).toHaveBeenCalledWith(mockDigest.items, 10); // Default limit is 10
      expect(DecoderService.prototype.generateSummary).toHaveBeenCalledTimes(1);
      expect(DecoderService.prototype.generateSummary).toHaveBeenCalledWith(
        mockDigest,
        prioritizedMockArticles, // Should pass the prioritized articles
        mockLinkedInPage
      );
    });
  });
});
