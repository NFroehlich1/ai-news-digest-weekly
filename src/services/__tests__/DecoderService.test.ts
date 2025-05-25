
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DecoderService from '../DecoderService';
import type { RssItem, WeeklyDigest } from '@/types/newsTypes';
import { toast } from 'sonner';

// Mock 'sonner' for toast notifications
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('DecoderService', () => {
  let decoderService: DecoderService;

  beforeEach(() => {
    decoderService = new DecoderService(); // Updated to use no arguments
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyApiKey', () => {
    it('should return valid for a proper API key', async () => {
      const result = await decoderService.verifyApiKey();
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('API-Schlüssel ist gültig');
    });

    it('should return invalid for placeholder API key', async () => {
      const serviceWithPlaceholder = new DecoderService(); // Updated to use no arguments
      const result = await serviceWithPlaceholder.verifyApiKey();
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Kein gültiger API-Schlüssel vorhanden');
    });
  });

  describe('generateSummary', () => {
    it('should generate summary with articles', async () => {
      const mockDigest: WeeklyDigest = {
        id: '2023-W40',
        weekNumber: 40,
        year: 2023,
        dateRange: 'Oct 02 - Oct 08',
        title: 'Weekly AI News',
        summary: 'Digest of AI news',
        items: [
          {
            title: 'Test Article',
            description: 'Test description',
            content: 'Full content here',
            link: 'http://example.com/test',
            pubDate: new Date().toISOString(),
            sourceName: 'Test Source',
            categories: ['AI'],
            guid: 'item1',
          }
        ],
        createdAt: new Date(),
      };

      const result = await decoderService.generateSummary(mockDigest, mockDigest.items);
      expect(typeof result).toBe('string');
      expect(result).toContain('LINKIT WEEKLY');
      expect(result).not.toContain('KI-News von The Decoder');
    });

    it('should throw error when no articles provided', async () => {
      const mockDigest: WeeklyDigest = {
        id: '2023-W41',
        weekNumber: 41,
        year: 2023,
        dateRange: 'Oct 09 - Oct 15',
        title: 'Another Weekly AI News',
        summary: 'Another digest',
        items: [],
        createdAt: new Date(),
      };

      await expect(decoderService.generateSummary(mockDigest, [])).rejects.toThrow('Keine Artikel für die Zusammenfassung verfügbar');
    });
  });

  describe('generateArticleSummary', () => {
    it('should generate clean article summary', async () => {
      const mockArticle: RssItem = {
        title: 'Test Article',
        description: 'Test description',
        content: 'Test content',
        link: 'http://example.com/test',
        pubDate: new Date().toISOString(),
        sourceName: 'Test Source',
        guid: 'test-guid',
      };

      const result = await decoderService.generateArticleSummary(mockArticle);
      expect(typeof result).toBe('string');
      expect(result).toContain('Test Article');
      expect(result).not.toContain('**');
      expect(result).not.toContain('*');
      expect(result).not.toContain('Zusammenfassung von');
    });
  });
});
