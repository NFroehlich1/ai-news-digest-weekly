
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DecoderService from '../DecoderService';
import type { RssItem, WeeklyDigest } from '@/types/newsTypes';
import { toast } from 'sonner';

// Mock 'sonner' for toast notifications
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(), // Mock other toast functions if used by the service
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('DecoderService', () => {
  let decoderService: DecoderService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    decoderService = new DecoderService(mockApiKey);
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateSummary', () => {
    it('should generate prompt with truncated description for items without aiSummary and full aiSummary for others', async () => {
      // Mock verifyApiKey to be successful
      const verifyApiKeySpy = vi.spyOn(decoderService, 'verifyApiKey').mockResolvedValue({ isValid: true, message: 'API key is valid' });

      // Mock the getUniqueArticles method
      const getUniqueArticlesSpy = vi.spyOn(decoderService as any, 'getUniqueArticles').mockImplementation((items) => items);

      const mockDigest: WeeklyDigest = {
        id: '2023-W40',
        weekNumber: 40,
        year: 2023,
        dateRange: 'Oct 02 - Oct 08',
        title: 'Weekly AI News',
        summary: 'Digest of AI news',
        items: [
          {
            title: 'Item with long description',
            description: 'a'.repeat(600), // Description longer than 500 chars
            link: 'http://example.com/long-desc',
            pubDate: new Date().toISOString(),
            sourceName: 'Test Source 1',
            categories: ['AI'],
            guid: 'item1',
          },
          {
            title: 'Item with AI summary',
            description: 'Short description.',
            aiSummary: 'This is an AI summary.',
            link: 'http://example.com/ai-summary',
            pubDate: new Date().toISOString(),
            sourceName: 'Test Source 2',
            categories: ['ML'],
            guid: 'item2',
          },
        ],
        createdAt: new Date(),
      };

      const mockSelectedArticles = mockDigest.items;
      const mockLinkedInPage = 'https://linkedin.com/company/test';

      // Mock fetch response for the AI API call
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Generated Summary Text' }] } }],
        }),
      });

      await decoderService.generateSummary(mockDigest, mockSelectedArticles, mockLinkedInPage);

      expect(verifyApiKeySpy).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only the generateContent call for summary

      const fetchCallBody = JSON.parse((global.fetch as vi.Mock).mock.calls[0][1].body);
      const prompt = fetchCallBody.contents[0].parts[0].text;

      // Assert description truncation for the first item
      expect(prompt).toContain('Beschreibung: ' + 'a'.repeat(500) + '...');
      // Assert AI summary inclusion for the second item
      expect(prompt).toContain('AI-Zusammenfassung: This is an AI summary.');
      // Assert LinkedIn page inclusion
      expect(prompt).toContain(mockLinkedInPage);
    });

    it('should call toast.error and return a fallback newsletter on API key verification failure', async () => {
      const customErrorMessage = 'Custom API Key Error Message';
      // Mock verifyApiKey to fail
      const verifyApiKeySpy = vi.spyOn(decoderService, 'verifyApiKey').mockResolvedValue({ isValid: false, message: customErrorMessage });
      
      // Spy on the private formatComprehensiveNewsletter method.
      // Need to cast to 'any' to access private method for testing purposes.
      const formatFallbackSpy = vi.spyOn(decoderService as any, 'formatComprehensiveNewsletter');

      const mockDigest: WeeklyDigest = {
        id: '2023-W41',
        weekNumber: 41,
        year: 2023,
        dateRange: 'Oct 09 - Oct 15',
        title: 'Another Weekly AI News',
        summary: 'Another digest',
        items: [{ title: 'Test Item', description: 'Test desc', link: 'http://example.com/item3', pubDate: new Date().toISOString(), sourceName: 'Test Source 3', guid: 'item3' }],
        createdAt: new Date(),
      };

      const result = await decoderService.generateSummary(mockDigest);

      expect(verifyApiKeySpy).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(customErrorMessage); // This toast is for the API key problem itself
      expect(toast.error).toHaveBeenCalledWith(`Fehler bei der Zusammenfassung: ${customErrorMessage}`); // This toast is from the catch block
      
      // Ensure the main AI API (fetch for generating summary) was not called
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Check that the fallback mechanism was invoked
      expect(formatFallbackSpy).toHaveBeenCalled();
      expect(typeof result).toBe('string'); // Fallback should return a string
      expect(result).toContain("LINKIT WEEKLY"); // Basic check for fallback content
    });
  });
});
