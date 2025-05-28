
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, source_name } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching RSS from: ${url}`);

    // Fetch the RSS feed directly from the server
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsDigestApp/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rssText = await response.text();
    
    // Parse RSS/XML content
    const articles = await parseRSSContent(rssText, source_name || 'Unknown Source');
    
    console.log(`Successfully parsed ${articles.length} articles from ${url}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        articles: articles,
        source_url: url,
        source_name: source_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching RSS:', error);
    return new Response(
      JSON.stringify({ 
        error: `Fehler beim Abrufen des RSS-Feeds: ${error.message}`,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function parseRSSContent(rssText: string, sourceName: string) {
  try {
    // Simple XML parsing for RSS feeds
    const articles = [];
    
    // Extract items using regex (simple approach for RSS)
    const itemMatches = rssText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    
    for (const itemMatch of itemMatches) {
      try {
        const title = extractXMLContent(itemMatch, 'title');
        const link = extractXMLContent(itemMatch, 'link');
        const description = extractXMLContent(itemMatch, 'description');
        const pubDate = extractXMLContent(itemMatch, 'pubDate');
        const creator = extractXMLContent(itemMatch, 'dc:creator') || extractXMLContent(itemMatch, 'author');
        const guid = extractXMLContent(itemMatch, 'guid') || link;

        // Extract categories
        const categoryMatches = itemMatch.match(/<category[^>]*>([^<]*)<\/category>/gi) || [];
        const categories = categoryMatches.map(cat => 
          cat.replace(/<[^>]*>/g, '').trim()
        ).filter(cat => cat.length > 0);

        // Try to extract image URL
        let imageUrl = null;
        const enclosureMatch = itemMatch.match(/<enclosure[^>]*url="([^"]*)"[^>]*type="image/i);
        if (enclosureMatch) {
          imageUrl = enclosureMatch[1];
        } else {
          // Try other image sources
          const mediaMatch = itemMatch.match(/<media:content[^>]*url="([^"]*)"[^>]*medium="image"/i) ||
                            itemMatch.match(/<media:thumbnail[^>]*url="([^"]*)"/i);
          if (mediaMatch) {
            imageUrl = mediaMatch[1];
          }
        }

        if (title && link) {
          articles.push({
            title: cleanText(title),
            link: link.trim(),
            guid: guid?.trim() || link.trim(),
            pubDate: parsePubDate(pubDate),
            sourceName: sourceName,
            description: cleanText(description) || null,
            content: null,
            categories: categories,
            creator: cleanText(creator) || null,
            imageUrl: imageUrl
          });
        }
      } catch (itemError) {
        console.warn('Error parsing RSS item:', itemError);
        // Continue with next item
      }
    }

    return articles;
  } catch (error) {
    console.error('Error parsing RSS content:', error);
    return [];
  }
}

function extractXMLContent(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function cleanText(text: string | null): string | null {
  if (!text) return null;
  
  // Remove HTML tags and decode HTML entities
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parsePubDate(pubDate: string | null): string {
  if (!pubDate) return new Date().toISOString();
  
  try {
    const date = new Date(pubDate.trim());
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
