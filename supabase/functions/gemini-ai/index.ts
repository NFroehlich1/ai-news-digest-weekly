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

  // Erstelle einen detaillierten, studentenorientierten Prompt basierend auf den tatsächlichen Artikeln
  const articleDetails = articlesToUse.map((article: any, index: number) => `
**ARTIKEL ${index + 1}:**
Titel: "${article.title}"
Beschreibung: "${article.description || 'Keine Beschreibung verfügbar'}"
Quelle: ${article.sourceName || 'Unbekannte Quelle'}
Datum: ${article.pubDate}
Link: ${article.link}
`).join('\n');

  const prompt = `Du schreibst als Student für Studenten den Newsletter "LINKIT WEEKLY" - für eine HOCHSCHULGRUPPE zu KI, Data Science und Machine Learning. 

**ZIELGRUPPE:** 
- Studierende in Informatik, Data Science, Mathematik, Ingenieurswissenschaften
- Bachelor- und Master-Studierende, die sich für KI und ML interessieren
- Junge Menschen, die praktische Anwendungen und Karrierechancen suchen
- Community von tech-begeisterten Studierenden

**NEWSLETTER-STIL (genau wie bisherige Ausgaben):**
- Persönlich und direkt ("Hey zusammen", "ihr", "euch")
- Studentenfreundlich und auf Augenhöhe
- Praktische Relevanz für Studium und Zukunft
- Verbindung zu Uni-Leben (Vorlesungen, Projekte, Abschlussarbeiten)
- Enthusiastisch aber wissenschaftlich fundiert
- Fokus auf Tools, die Studierende nutzen können

**STRUKTUR für KW ${digest.weekNumber}/${digest.year} (${digest.dateRange}):**

# 📬 LINKIT WEEKLY KW ${digest.weekNumber}
**Dein Update zu KI, Data Science und Industrie 4.0**

KW ${digest.weekNumber} · ${digest.dateRange}

**Intro-Begrüßung:**
- "Hey zusammen," oder "Hallo zusammen,"
- Kurzer, persönlicher Einstieg
- Was euch diese Woche erwartet

**Hauptteil - Artikel-Analysen:**
Für jeden Artikel:
- **Blaue Überschrift** mit dem Kern des Artikels
- 2-3 Absätze detaillierte Analyse
- **Warum das für euch relevant ist:** Praktische Bedeutung für Studierende
- Verbindung zu Vorlesungsinhalten
- Anwendung in Projekten/Abschlussarbeiten
- Tools und Frameworks, die ihr ausprobieren könnt
- 👉 **Details hier** [Link zum Artikel]

**Schlussteil:**
- Zusammenfassung der wichtigsten Erkenntnisse
- Was das für kommende Projekte bedeutet
- Aufruf zur Diskussion in der Community

**WICHTIGE STILELEMENTE:**
- Verwende die EXAKTEN Inhalte aus den bereitgestellten Artikeln
- Erkläre komplexe KI-Konzepte verständlich
- Stelle Bezug zu typischen Uni-Kursen her (ML, Deep Learning, Data Mining, etc.)
- Erwähne konkrete Tools: Python, PyTorch, TensorFlow, Jupyter, etc.
- Betone praktische Anwendungen und Karrierechancen
- Mindestens 1500-2000 Wörter für ausführliche Analysen
- Enthusiastischer aber professioneller Ton

**NEWSLETTER-INHALT basierend auf diesen Artikeln:**
${articleDetails}

Schreibe einen Newsletter, der die Begeisterung für KI und Data Science bei Studierenden weckt und praktischen Mehrwert für ihr Studium bietet!`;

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
          temperature: 0.3, // Leicht erhöht für natürlicheren studentischen Stil
          topK: 30,
          topP: 0.9,
          maxOutputTokens: 5000, // Erhöht für längere, detailliertere Inhalte
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
    
    // Add LinkedIn reference with student-friendly context if not present and linkedInPage is provided
    if (linkedInPage && !content.includes("linkedin.com/company/linkit-karlsruhe")) {
      content += `\n\n---\n\n**Bleibt connected! 🤝**\nFür weitere Updates, Diskussionen und Community-Events folgt uns auf [LinkedIn](${linkedInPage}). Dort teilen wir auch Infos zu Workshops, Gastvorträgen und Networking-Möglichkeiten!`;
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
  
  const prompt = `Du hilfst Studierenden einer KI und Data Science Hochschulgruppe beim Verstehen von tech-Artikeln. 

Fasse diesen Artikel in 2-3 prägnanten Sätzen zusammen und erkläre kurz, warum er für Studierende relevant ist:
              
Titel: ${article.title}
Beschreibung: ${article.description || 'Keine Beschreibung verfügbar'}
Link: ${article.link}

Stil: Wissenschaftlich aber zugänglich, direkt und studentenfreundlich ("Das ist relevant für euch, weil..."). Fokus auf praktische Anwendungen im Studium.`;

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
