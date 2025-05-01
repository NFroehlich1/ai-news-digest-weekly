
import { RssItem, RssSource } from '../types/newsTypes';

// Mock data for testing when API fails
export const MOCK_NEWS_ITEMS: RssItem[] = [
  {
    title: "Google kündigt Gemini 2.0 an: KI-Modell macht bedeutenden Sprung",
    link: "https://the-decoder.de/google-gemini-2-0-announced/",
    pubDate: new Date().toISOString(),
    description: "Google hat mit Gemini 2.0 ein neues KI-Modell angekündigt, das signifikante Verbesserungen bringt.",
    content: "<p>Google hat mit Gemini 2.0 ein neues KI-Modell angekündigt, das signifikante Verbesserungen bringt.</p>",
    categories: ["Google", "Gemini", "KI-Modelle"],
    creator: "The Decoder Team",
    imageUrl: "https://picsum.photos/800/600"
  },
  {
    title: "OpenAI stellt neuartige Text-zu-Video-KI vor",
    link: "https://the-decoder.de/openai-text-to-video/",
    pubDate: new Date(Date.now() - 86400000).toISOString(), // yesterday
    description: "OpenAI präsentiert eine neue Text-zu-Video-KI, die beeindruckende Ergebnisse liefert.",
    content: "<p>OpenAI präsentiert eine neue Text-zu-Video-KI, die beeindruckende Ergebnisse liefert.</p>",
    categories: ["OpenAI", "Text-zu-Video", "Generative KI"],
    creator: "The Decoder Team",
    imageUrl: "https://picsum.photos/800/600?random=2"
  },
  {
    title: "Meta verbessert seine Übersetzungs-KI für über 100 Sprachen",
    link: "https://the-decoder.de/meta-translation-ai/",
    pubDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    description: "Meta hat seine Übersetzungs-KI um weitere Sprachen erweitert und die Qualität verbessert.",
    content: "<p>Meta hat seine Übersetzungs-KI um weitere Sprachen erweitert und die Qualität verbessert.</p>",
    categories: ["Meta", "Übersetzung", "KI"],
    creator: "The Decoder Team",
    imageUrl: "https://picsum.photos/800/600?random=3"
  },
  {
    title: "Anthropic stellt neue Version von Claude vor",
    link: "https://the-decoder.de/anthropic-claude-new-version/",
    pubDate: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    description: "Anthropic hat eine neue Version seines KI-Assistenten Claude veröffentlicht.",
    content: "<p>Anthropic hat eine neue Version seines KI-Assistenten Claude veröffentlicht.</p>",
    categories: ["Anthropic", "Claude", "KI-Assistenten"],
    creator: "The Decoder Team",
    imageUrl: "https://picsum.photos/800/600?random=4"
  }
];

// Default RSS sources
export const DEFAULT_RSS_SOURCES: RssSource[] = [
  {
    url: "https://the-decoder.de/feed/",
    name: "The Decoder",
    enabled: true
  }
];
