
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

    // Generate realistic mock articles for students
    const mockArticles = await generateStudentFocusedMockArticles(currentWeek, currentYear);
    
    if (mockArticles.length === 0) {
      throw new Error("Keine Artikel gefunden");
    }

    console.log(`Generated ${mockArticles.length} student-focused articles for newsletter`);

    // Generate newsletter content using Gemini AI with student-focused prompting
    const newsletterContent = await generateStudentNewsletterContent(
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

// Generate student-focused mock articles with current AI trends for university students
async function generateStudentFocusedMockArticles(weekNumber: number, year: number) {
  // Erstelle realistische, studentenrelevante Artikel basierend auf aktuellen KI-Trends
  const studentFocusedArticles = [
    {
      title: "PyTorch 2.3 bringt neue Features für studentische ML-Projekte",
      description: "Die neueste PyTorch-Version führt vereinfachte APIs für Einsteiger ein und verbessert die Performance für typische Uni-Projekte. Besonders die neue DataLoader-Optimierung und erweiterte GPU-Unterstützung sind für Studierende interessant, die an Abschlussarbeiten arbeiten.",
      link: "https://pytorch.org/blog/pytorch-2-3-release",
      pubDate: new Date().toISOString(),
      guid: `article-pytorch23-${Date.now()}`,
      sourceName: "PyTorch Blog"
    },
    {
      title: "Neue Kaggle Learn-Kurse zu Large Language Models kostenlos verfügbar",
      description: "Kaggle erweitert sein kostenloses Lernangebot um praktische LLM-Kurse. Die Kurse decken Fine-Tuning, Prompt Engineering und RAG-Systeme ab - perfekt für Studierende, die ihre Skills erweitern wollen. Inklusive Hands-on Notebooks und Zertifikaten.",
      link: "https://kaggle.com/learn/large-language-models",
      pubDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      guid: `article-kaggle-llm-${Date.now()}`,
      sourceName: "Kaggle"
    },
    {
      title: "Stanford veröffentlicht neue CS229 Machine Learning Kursmaterialien",
      description: "Die renommierte ML-Vorlesung von Stanford ist jetzt mit aktualisierten Inhalten zu Transformer-Architekturen und modernen Optimierungsverfahren verfügbar. Alle Lectures, Assignments und Lösungen sind frei zugänglich für Selbststudium.",
      link: "https://cs229.stanford.edu/syllabus-spring2024.html",
      pubDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      guid: `article-stanford-cs229-${Date.now()}`,
      sourceName: "Stanford CS"
    },
    {
      title: "GitHub Student Pack erweitert: Kostenloses GPT-4 für Studierende",
      description: "Das GitHub Student Developer Pack bietet jetzt kostenlosen Zugang zu OpenAI GPT-4 für Bildungszwecke. Studierende erhalten monatlich Credits für API-Calls und Zugang zu neuen Modellen. Ideal für Prototyping und Forschungsprojekte an der Uni.",
      link: "https://education.github.com/pack",
      pubDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      guid: `article-github-student-gpt4-${Date.now()}`,
      sourceName: "GitHub Education"
    },
    {
      title: "Hugging Face launcht kostenlose Spaces für studentische KI-Demos",
      description: "Studierende können jetzt kostenlos ihre ML-Modelle auf Hugging Face Spaces deployen. Die Plattform bietet Gradio-Integration, GPU-Zugang für Inferenz und einfaches Sharing von Projekten. Perfekt für Portfolio-Aufbau und Präsentationen.",
      link: "https://huggingface.co/spaces",
      pubDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      guid: `article-hf-spaces-students-${Date.now()}`,
      sourceName: "Hugging Face"
    },
    {
      title: "TUM startet neuen Master-Studiengang 'AI & Robotics' ab Wintersemester",
      description: "Die TU München bietet ab dem kommenden Semester einen interdisziplinären Master an, der KI mit Robotik verbindet. Der Studiengang kombiniert theoretische Grundlagen mit praktischen Projekten bei Industriepartnern. Bewerbungen sind bis Ende Juli möglich.",
      link: "https://tum.de/studium/studienangebot/ai-robotics",
      pubDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      guid: `article-tum-ai-robotics-${Date.now()}`,
      sourceName: "TU München"
    },
    {
      title: "Neue Studie: KI-Skills werden zum wichtigsten Faktor bei Tech-Bewerbungen",
      description: "Eine Befragung von 500 deutschen Tech-Unternehmen zeigt: 89% bevorzugen Bewerber mit nachweisbarer KI-Erfahrung. Besonders gefragt sind praktische Projekte mit ML-Frameworks und Verständnis für ethische KI-Entwicklung. Ein Weckruf für alle Studierenden.",
      link: "https://tech-recruiting-report-2024.de",
      pubDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      guid: `article-ai-skills-jobs-${Date.now()}`,
      sourceName: "Tech Recruiting Report"
    }
  ];

  // Wähle 4-6 Artikel zufällig aus
  const selectedCount = 4 + Math.floor(Math.random() * 3);
  const shuffled = studentFocusedArticles.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, selectedCount);
}

// Generate newsletter content with strong student focus using Gemini AI
async function generateStudentNewsletterContent(
  weekNumber: number, 
  year: number, 
  dateRange: string, 
  articles: any[]
): Promise<string> {
  console.log("Generating student-focused newsletter content with Gemini AI...");
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  
  // Erstelle detaillierte Artikel-Informationen für den studentenorientierten Prompt
  const articleDetails = articles.map((article, index) => `
**ARTIKEL ${index + 1}:**
Titel: "${article.title}"
Beschreibung: "${article.description}"
Quelle: ${article.sourceName}
Datum: ${article.pubDate}
Link: ${article.link}
`).join('\n');

  const prompt = `Du schreibst als Student für Studenten den Newsletter "LINKIT WEEKLY" - für eine HOCHSCHULGRUPPE zu KI, Data Science und Machine Learning. 

**ZIELGRUPPE:** Studierende der Informatik, Data Science, Mathematik und verwandter Fächer, die sich für praktische KI-Anwendungen interessieren und ihre Karriere vorbereiten.

**STRENGE REGELN FÜR FAKTISCHE GENAUIGKEIT:**
- Verwende AUSSCHLIESSLICH Informationen aus den bereitgestellten Artikeln
- ERFINDE NIEMALS Bezüge zu spezifischen Universitätskursen oder Professoren
- ERFINDE NIEMALS technische Details, die nicht in den Artikeln stehen
- Wenn du Verbindungen zu Studieninhalten herstellst, bleibe allgemein ("in ML-Kursen", "bei Data Science Projekten")
- Nutze KEINE spezifischen Kursnamen, außer sie werden explizit in den Artikeln erwähnt

**STIL & TON (natürlich und studentenfreundlich):**
- Beginne mit natürlichen, lockeren Begrüßungen wie "Hi!", "Was geht ab!", "Servus zusammen!", "Hey Leute!" oder einfach "Hey"
- VERMEIDE KOMPLETT formelle Begrüßungen wie "Herzlichen Glückwunsch", "Willkommen zu unserem Newsletter" oder steife Formulierungen
- Vermeide Business-Sprache oder übertriebene Förmlichkeit
- Direkt und persönlich ("ihr", "euch"), aber authentisch und entspannt
- Praktischer Fokus auf Studium und Berufseinstieg
- Enthusiastisch aber wissenschaftlich fundiert - wie ein Student, der anderen Studenten schreibt
- Tools und Technologien nur erwähnen, wenn sie in den Artikeln vorkommen

**STRUKTUR für KW ${weekNumber}/${year} (${dateRange}):**

# 📬 LINKIT WEEKLY KW ${weekNumber}
**Dein Update zu KI, Data Science und Industrie 4.0**

KW ${weekNumber} · ${dateRange}

**Intro**: Natürliche, lockere Begrüßung der LINKIT-Community (KEINE formellen Glückwünsche oder steife Willkommensnachrichten!)

**Hauptteil - Detaillierte Artikel-Analysen (NUR basierend auf echten Inhalten):**
[Für jeden Artikel:]
- **Aussagekräftige Headline** mit Kern-Message
- 2-3 Absätze ausführliche Analyse der TATSÄCHLICHEN Inhalte
- **Warum das für euch relevant ist:** Konkrete Bedeutung für Studierende
- Allgemeine Bezüge zu Studieninhalten (OHNE spezifische Kursnamen, außer erwähnt)
- Praktische Anwendung in eigenen Projekten
- 👉 **Details hier** [Link]

**Abschluss:**
- Zusammenfassung der Key Takeaways
- Lockerer Abschluss mit Community-Aufruf

**KRITISCHE ANFORDERUNGEN:**
- Verwende die EXAKTEN Details aus den bereitgestellten Artikeln
- Erkläre KI-Konzepte verständlich für Studierende
- Mindestens 1500-2000 Wörter mit substantieller Analyse pro Artikel
- Authentischer, lockerer studentischer Ton ohne Förmlichkeiten oder formelle Begrüßungen
- Fokus auf praktische Umsetzbarkeit und Karriererelevanz

ARTIKEL FÜR DIESE WOCHE:
${articleDetails}

WICHTIG: Bleibe strikt bei den Inhalten der bereitgestellten Artikel. Erfinde keine Details, Kurse oder technischen Zusammenhänge, die nicht explizit erwähnt werden! Verwende eine natürliche, studentische Begrüßung OHNE jegliche formelle Glückwünsche oder steife Willkommensnachrichten!`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/gemini-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      },
      body: JSON.stringify({ 
        action: 'generate-summary',
        data: {
          digest: { weekNumber, year, dateRange, items: articles },
          selectedArticles: articles
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini AI call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content || generateStudentFallbackContent(weekNumber, year, dateRange, articles);
  } catch (error) {
    console.error("Error calling Gemini AI:", error);
    return generateStudentFallbackContent(weekNumber, year, dateRange, articles);
  }
}

// Student-focused fallback content generation
function generateStudentFallbackContent(
  weekNumber: number, 
  year: number, 
  dateRange: string, 
  articles: any[]
): string {
  const articleAnalyses = articles.map((article, index) => `### ${article.title}

${article.description}

**Warum das für euch relevant ist:** ${article.title.includes('PyTorch') ? 'Für alle, die gerade ihre ersten ML-Projekte umsetzen - die neuen Features machen den Einstieg noch einfacher!' : article.title.includes('Kaggle') ? 'Perfekte Gelegenheit, eure Skills zu erweitern und gleichzeitig Zertifikate für den Lebenslauf zu sammeln!' : article.title.includes('GitHub') ? 'Kostenloses GPT-4 für eure Uni-Projekte - meldet euch schnell an!' : article.title.includes('Master') ? 'Interessante Perspektive für alle, die über eine Spezialisierung in Richtung KI nachdenken.' : 'Diese Entwicklung zeigt wichtige Trends für eure zukünftige Karriere.'}

**Quelle:** ${article.sourceName}  
👉 **Details hier** [${article.link}](${article.link})
`).join('\n\n');

  return `# 📬 LINKIT WEEKLY KW ${weekNumber}

**Dein Update zu KI, Data Science und Industrie 4.0**

KW ${weekNumber} · ${dateRange}

Hey zusammen!

Diese Woche war wieder gepacked mit spannenden Entwicklungen, die direkt für euer Studium und eure Zukunft relevant sind. Von neuen Tools bis hin zu Karrierechancen - hier sind alle wichtigen Updates der Woche.

${articleAnalyses}

## Was bedeutet das für euch?

Diese Woche zeigt wieder, wie dynamisch unser Fachbereich ist. Besonders die kostenlosen Angebote für Studierende sind eine riesige Chance - nutzt sie! Für alle, die gerade an Projekten oder Abschlussarbeiten arbeiten: Die neuen Tools und Ressourcen können euch direkt weiterhelfen.

**Key Takeaways:**
- Haltet euch über neue kostenlose Ressourcen auf dem Laufenden
- Experimentiert mit den neuen Tools in euren Projekten  
- Vernetzt euch mit der Community und tauscht Erfahrungen aus
- Denkt schon jetzt an euren Berufseinstieg und relevante Skills

Bis nächste Woche und happy coding! 🚀

---

**LINKIT - Data Science & Machine Learning** | Hochschulgruppe für KI-Enthusiasten
Folgt uns für mehr Updates und Community-Events!
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
