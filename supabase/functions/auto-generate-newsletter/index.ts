
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== AUTO NEWSLETTER GENERATION STARTED ===");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumber(now);
    const dateRange = getWeekDateRange(currentWeek, currentYear);
    
    console.log(`Generating newsletter for week ${currentWeek}/${currentYear}`);

    // Check if newsletter for this week already exists
    const { data: existingNewsletter } = await supabase
      .from('newsletter_archive')
      .select('id')
      .eq('week_number', currentWeek)
      .eq('year', currentYear)
      .single();

    if (existingNewsletter) {
      console.log(`Newsletter for week ${currentWeek}/${currentYear} already exists`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Newsletter für KW ${currentWeek}/${currentYear} bereits vorhanden`,
          existing: true 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch RSS feeds (simulate the RSS fetching process)
    const mockArticles = await generateMockArticles(3, 9);
    
    if (mockArticles.length === 0) {
      throw new Error("Keine Artikel gefunden");
    }

    console.log(`Generated ${mockArticles.length} articles for newsletter`);

    // Generate newsletter content using Gemini AI
    const newsletterContent = await generateNewsletterContent(
      currentWeek,
      currentYear,
      dateRange,
      mockArticles
    );

    if (!newsletterContent) {
      throw new Error("Newsletter-Generierung fehlgeschlagen");
    }

    // Save to newsletter archive
    const { data: savedNewsletter, error: saveError } = await supabase
      .from('newsletter_archive')
      .insert({
        week_number: currentWeek,
        year: currentYear,
        title: `LINKIT WEEKLY KW ${currentWeek}`,
        content: newsletterContent,
        html_content: convertMarkdownToHTML(newsletterContent),
        date_range: dateRange,
        article_count: mockArticles.length
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Fehler beim Speichern: ${saveError.message}`);
    }

    console.log(`✅ Newsletter successfully saved with ID: ${savedNewsletter.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Newsletter für KW ${currentWeek}/${currentYear} erfolgreich generiert und gespeichert`,
        newsletterId: savedNewsletter.id,
        articleCount: mockArticles.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("❌ Error in auto-generate-newsletter:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Newsletter-Generierung fehlgeschlagen", 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Helper function to get week date range
function getWeekDateRange(weekNumber: number, year: number): string {
  const startDate = getDateOfISOWeek(weekNumber, year);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  const formatDate = (date: Date) => date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  return `${formatDate(startDate)}–${formatDate(endDate)}`;
}

// Helper function to get date of ISO week
function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getDay();
  const date = simple;
  if (dayOfWeek <= 4) {
    date.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    date.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return date;
}

// Generate mock articles (replace with actual RSS fetching)
async function generateMockArticles(minCount: number, maxCount: number) {
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  const articles = [];
  
  const topics = [
    "OpenAI stellt GPT-5 vor - Revolutionary AI capabilities",
    "Google Gemini Update bringt neue Features",
    "Microsoft Copilot Integration in Office",
    "Meta AI revolutioniert Social Media",
    "Tesla FSD: Neueste Entwicklungen im autonomen Fahren",
    "Amazon Alexa bekommt ChatGPT-Integration",
    "Apple Intelligence: KI auf dem iPhone",
    "NVIDIA präsentiert neue KI-Chips",
    "DeepMind löst komplexe Protein-Strukturen"
  ];
  
  for (let i = 0; i < count; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    articles.push({
      title: topic,
      description: `Aktuelle Entwicklungen in der KI-Welt: ${topic}. Neue Technologien und Innovationen prägen die Zukunft der Künstlichen Intelligenz.`,
      link: `https://example.com/article-${i + 1}`,
      pubDate: new Date().toISOString(),
      guid: `article-${Date.now()}-${i}`,
      source: "KI News"
    });
  }
  
  return articles;
}

// Generate newsletter content using Gemini AI
async function generateNewsletterContent(
  weekNumber: number, 
  year: number, 
  dateRange: string, 
  articles: any[]
): Promise<string> {
  console.log("Generating newsletter content with Gemini AI...");
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  
  const prompt = `Erstelle einen professionellen KI-Newsletter für die KW ${weekNumber}/${year} (${dateRange}).

Verfügbare Artikel:
${articles.map((article, index) => `${index + 1}. ${article.title}\n   ${article.description}`).join('\n\n')}

Erstelle einen Newsletter mit:
- Professionellem Header "📬 LINKIT WEEKLY KW ${weekNumber}"
- Kurze Einleitung
- Zusammenfassung der wichtigsten KI-Trends der Woche
- Detaillierte Beschreibung der Artikel mit Insights
- Professionellem Abschluss mit Ausblick

Schreibe in einem professionellen, informativen Ton auf Deutsch.`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/gemini-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`Gemini AI call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.response || generateFallbackContent(weekNumber, year, dateRange, articles);
  } catch (error) {
    console.error("Error calling Gemini AI:", error);
    return generateFallbackContent(weekNumber, year, dateRange, articles);
  }
}

// Fallback content generation
function generateFallbackContent(
  weekNumber: number, 
  year: number, 
  dateRange: string, 
  articles: any[]
): string {
  return `# 📬 LINKIT WEEKLY KW ${weekNumber}

**${dateRange}**

## Willkommen zum KI-Newsletter

Diese Woche bringen wir Ihnen die wichtigsten Entwicklungen aus der Welt der Künstlichen Intelligenz.

## Die Highlights der Woche

${articles.map((article, index) => `### ${index + 1}. ${article.title}

${article.description}

🔗 [Weiterlesen](${article.link})
`).join('\n')}

## Ausblick

Die KI-Landschaft entwickelt sich rasant weiter. Bleiben Sie dran für weitere spannende Entwicklungen!

---

**LINKIT KI-Newsletter** | Ihre wöchentliche Dosis KI-News
`;
}

// Convert markdown to HTML (basic conversion)
function convertMarkdownToHTML(markdown: string): string {
  return markdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2">$1</a>')
    .replace(/\n/gim, '<br>');
}
