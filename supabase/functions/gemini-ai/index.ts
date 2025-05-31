
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

**STRENGE REGELN FÜR FAKTISCHE GENAUIGKEIT:**
- Verwende AUSSCHLIESSLICH Informationen aus den bereitgestellten Artikeln
- ERFINDE NIEMALS Bezüge zu spezifischen Universitätskursen oder Professoren
- ERFINDE NIEMALS technische Details, die nicht in den Artikeln stehen
- Wenn du Verbindungen zu Studieninhalten herstellst, bleibe allgemein ("in ML-Kursen", "bei Data Science Projekten")
- Nutze KEINE spezifischen Kursnamen wie "CS229" oder "Deep Learning Vorlesung"

**NEWSLETTER-STIL (natürlich und studentenfreundlich):**
- Beginne mit natürlichen, lockeren Begrüßungen wie "Hi!", "Was geht ab!", "Servus zusammen!", "Hey Leute!" oder einfach "Hey"
- VERMEIDE formelle Begrüßungen wie "Herzlichen Glückwunsch", "Willkommen zu unserem Newsletter" oder steife Formulierungen
- Schreibe direkt und persönlich ("ihr", "euch"), aber authentisch und entspannt
- Vermeide übertriebene Förmlichkeit oder Business-Sprache
- Sei enthusiastisch aber natürlich - wie ein Student, der anderen Studenten schreibt
- Fokus auf praktische Relevanz für das Studium

**STRUKTUR für KW ${digest.weekNumber}/${digest.year} (${digest.dateRange}):**

# 📬 LINKIT WEEKLY KW ${digest.weekNumber}
**Dein Update zu KI, Data Science und Industrie 4.0**

KW ${digest.weekNumber} · ${digest.dateRange}

**Intro mit natürlicher, lockerer Begrüßung:**
- Verwende eine entspannte, authentische Begrüßung (KEINE formellen Glückwünsche!)
- Kurzer, persönlicher Einstieg ohne Floskeln
- Was euch diese Woche erwartet

**Hauptteil - Artikel-Analysen (NUR basierend auf echten Inhalten):**
Für jeden Artikel:
- **Aussagekräftige Überschrift** mit dem Kern des Artikels
- 2-3 Absätze detaillierte Analyse der TATSÄCHLICHEN Inhalte
- **Warum das für euch relevant ist:** Praktische Bedeutung für Studierende
- Allgemeine Verbindungen zu Studieninhalten (OHNE spezifische Kursnamen)
- Mögliche Anwendungen in eigenen Projekten
- 👉 **Mehr dazu** [Link zum Artikel]

**Schlussteil:**
- Zusammenfassung der wichtigsten Erkenntnisse
- Lockerer Abschluss mit Community-Aufruf

**WICHTIGE STILELEMENTE:**
- Authentische, lockere Sprache ohne Förmlichkeiten oder steife Begrüßungen
- Erkläre KI-Konzepte verständlich, aber bleib bei den Fakten
- Erwähne Tools und Technologien nur, wenn sie in den Artikeln vorkommen
- Mindestens 1500-2000 Wörter für ausführliche Analysen
- Enthusiastischer aber faktenbasierter Ton wie unter Studierenden

**NEWSLETTER-INHALT basierend auf diesen Artikeln:**
${articleDetails}

WICHTIG: Bleibe strikt bei den Inhalten der bereitgestellten Artikel. Erfinde keine Details, Kurse oder technischen Zusammenhänge, die nicht explizit erwähnt werden! Verwende eine natürliche, studentische Begrüßung OHNE formelle Glückwünsche!`;

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

WICHTIG: Verwende nur Informationen aus dem bereitgestellten Artikel. Erfinde keine Details oder Verbindungen, die nicht explizit erwähnt werden.

Fasse diesen Artikel in 2-3 prägnanten Sätzen zusammen und erkläre kurz, warum er für Studierende relevant ist:
              
Titel: ${article.title}
Beschreibung: ${article.description || 'Keine Beschreibung verfügbar'}
Link: ${article.link}

Stil: Faktisch korrekt, wissenschaftlich aber zugänglich, direkt und studentenfreundlich. Fokus auf praktische Anwendungen im Studium, aber nur basierend auf den tatsächlichen Inhalten des Artikels.`;

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
