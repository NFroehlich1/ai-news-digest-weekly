
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
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Gemini API Key nicht konfiguriert' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { action, data } = await req.json();

    switch (action) {
      case 'verify-key':
        return await verifyGeminiKey(geminiApiKey);
      
      case 'generate-summary':
        return await generateSummary(geminiApiKey, data);
      
      case 'generate-article-summary':
        return await generateArticleSummary(geminiApiKey, data);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unbekannte Aktion' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('Error in gemini-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function verifyGeminiKey(apiKey: string) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Test"
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
        }
      })
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ isValid: true, message: "Gemini API-Schlüssel ist gültig" }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
      return new Response(
        JSON.stringify({ isValid: false, message: `API-Schlüssel ungültig: ${errorMessage}` }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ isValid: false, message: `Verbindungsfehler: ${error.message}` }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function generateSummary(apiKey: string, data: any) {
  const { digest, selectedArticles, linkedInPage } = data;
  const articlesToUse = selectedArticles || digest.items;
  
  if (articlesToUse.length === 0) {
    return new Response(
      JSON.stringify({ error: "Keine Artikel für die Zusammenfassung verfügbar" }), 
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Erstelle einen detaillierten, universitätsspezifischen Prompt basierend auf den tatsächlichen Artikeln
  const articleDetails = articlesToUse.map((article: any, index: number) => `
**ARTIKEL ${index + 1}:**
Titel: "${article.title}"
Beschreibung: "${article.description || 'Keine Beschreibung verfügbar'}"
Quelle: ${article.sourceName || 'Unbekannte Quelle'}
Datum: ${article.pubDate}
Link: ${article.link}
`).join('\n');

  const prompt = `Du schreibst den Newsletter für LINKIT - eine HOCHSCHULGRUPPE für Data Science und Machine Learning. 

**WICHTIGER KONTEXT:** LINKIT ist eine studentische Initiative an der Universität, die sich auf praktische Anwendungen von Data Science und Machine Learning fokussiert.

**ZIELGRUPPE:** 
- Studierende der Informatik, Data Science, Mathematik und verwandter Fächer
- Interesse an KI, ML, und datengetriebenen Technologien  
- Suchen nach praktischen Anwendungen und Karrieremöglichkeiten
- Arbeiten an Projekten, Abschlussarbeiten und ersten beruflichen Schritten

**NEWSLETTER-STIL:**
- Wissenschaftlich fundiert aber studentenfreundlich
- Fokus auf praktische Relevanz für Studium und Forschung
- Verbindung zu Vorlesungsinhalten und Projekten
- Enthusiastisch aber professionell
- Community-orientiert

**STRUKTUR für KW ${digest.weekNumber}/${digest.year} (${digest.dateRange}):**

📚 **LINKIT WEEKLY KW ${digest.weekNumber}** - Eure Data Science & ML News

**Einleitung:** Herzliche Begrüßung der LINKIT-Community

**🔬 Forschung & Entwicklung:**
Für jeden wissenschaftlichen Artikel:
- Relevanz für das Studium erklären
- Verbindung zu Vorlesungsinhalten (z.B. "Das kennt ihr aus der ML-Vorlesung...")
- Praktische Anwendungsmöglichkeiten für Projekte
- Bedeutung für Abschlussarbeiten

**🛠️ Tools & Technologien:**
Für Tool-Updates und neue Frameworks:
- Integration in bestehende Uni-Projekte
- Setup-Tipps für Studierende
- Relevanz für verschiedene Kurse

**💼 Karriere & Chancen:**
- Praktika und Job-Möglichkeiten
- Wettbewerbe und Challenges (besonders Kaggle)
- Networking-Gelegenheiten

**📝 Studien-Takeaways:**
- Konkrete Anwendungen für aktuelle Projekte
- Empfohlene Papers und Tutorials
- Vorbereitung auf kommende Klausuren/Semester

**Community-Abschluss:** Ermutigung zur Diskussion und Teilnahme

**KRITISCHE ANFORDERUNGEN:**
- Verwende die EXAKTEN Inhalte und Details aus den bereitgestellten Artikeln
- Erkläre technische Konzepte verständlich für Studierende
- Stelle Verbindungen zu typischen Universitätsinhalten her
- Jeder Artikel braucht 200-250 Wörter detaillierte, studentenrelevante Analyse
- Erwähne konkrete Tools, Frameworks und Methoden
- Zeige praktische Anwendungsmöglichkeiten auf
- Mindestens 1400-1700 Wörter Gesamtlänge

**NEWSLETTER-INHALT für diese Woche basierend auf:**
${articleDetails}

Erstelle einen Newsletter, der den universitären Charakter von LINKIT widerspiegelt und echten Mehrwert für Data Science & ML Studierende bietet!`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2, // Noch niedrigere Temperatur für konsistenten universitären Stil
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 4500, // Mehr Tokens für längere, detailliertere universitäre Inhalte
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = `Gemini API Fehler: ${response.status} - ${errorData?.error?.message || response.statusText}`;
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    
    if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content || !responseData.candidates[0].content.parts || !responseData.candidates[0].content.parts[0]) {
      throw new Error("Unerwartete Antwort von der Gemini API");
    }

    let content = responseData.candidates[0].content.parts[0].text;
    
    if (!content || content.trim().length === 0) {
      throw new Error("Gemini API hat leeren Inhalt zurückgegeben");
    }
    
    // Add LinkedIn reference with university context if not present and linkedInPage is provided
    if (linkedInPage && !content.includes("linkedin.com/company/linkit-karlsruhe")) {
      content += `\n\n---\n\n**Bleibt connected! 🤝**\nFür weitere Updates, Events und Community-Diskussionen folgt uns auf [LinkedIn](${linkedInPage}). Dort teilen wir auch Infos zu Workshops, Gastvorträgen und Networking-Events!`;
    }

    return new Response(
      JSON.stringify({ content }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating summary:", error);
    return new Response(
      JSON.stringify({ error: `Fehler bei der Newsletter-Generierung: ${error.message}` }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function generateArticleSummary(apiKey: string, data: any) {
  const { article } = data;
  
  const prompt = `Du hilfst Studierenden einer Data Science & ML Hochschulgruppe beim Verstehen von KI-Artikeln. 

Fasse diesen Artikel in 2-3 prägnanten Sätzen zusammen und erkläre kurz, warum er für Data Science/ML-Studierende relevant ist:
              
Titel: ${article.title}
Beschreibung: ${article.description || 'Keine Beschreibung verfügbar'}
Link: ${article.link}

Stil: Wissenschaftlich aber zugänglich, mit Fokus auf praktische Relevanz für das Studium.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 250,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Gemini API Fehler: ${response.status} - ${errorData?.error?.message || response.statusText}`);
    }

    const responseData = await response.json();
    
    if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content || !responseData.candidates[0].content.parts || !responseData.candidates[0].content.parts[0]) {
      throw new Error("Unerwartete Antwort von der Gemini API");
    }

    return new Response(
      JSON.stringify({ summary: responseData.candidates[0].content.parts[0].text }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating article summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
