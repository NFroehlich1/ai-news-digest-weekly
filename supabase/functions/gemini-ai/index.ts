
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

  const prompt = `Du bist ein Experte für KI-Newsletter und schreibst detaillierte, professionelle Zusammenfassungen für das LINKIT WEEKLY. 

WICHTIGE ANFORDERUNGEN:
- Schreibe einen ausführlichen, detaillierten Newsletter mit mindestens 800-1200 Wörtern
- Analysiere jeden Artikel tiefgehend und erkläre die Bedeutung für die KI-Branche
- Verwende eine professionelle, aber zugängliche Sprache
- Strukturiere den Newsletter klar mit Überschriften und Unterpunkten
- Füge Kontext und Hintergrundinformationen hinzu
- Erkläre technische Konzepte verständlich
- Zeige Verbindungen zwischen verschiedenen Entwicklungen auf
- Bewerte die Auswirkungen auf verschiedene Branchen und Anwendungsbereiche

STRUKTUR:
1. Einleitung mit Überblick über die Woche
2. Hauptartikel mit detaillierter Analyse (jeweils 150-200 Wörter pro Artikel)
3. Trends und Patterns der Woche
4. Ausblick und Implikationen
5. Fazit

Verwende Markdown-Formatierung für bessere Lesbarkeit.

Erstelle einen detaillierten Newsletter für Kalenderwoche ${digest.weekNumber}/${digest.year} (${digest.dateRange}) basierend auf diesen KI-Nachrichten:

${articlesToUse.map((article: any, index: number) => `
**Artikel ${index + 1}:**
Titel: ${article.title}
Beschreibung: ${article.description || 'Keine Beschreibung verfügbar'}
Link: ${article.link}
Datum: ${article.pubDate}
Quelle: ${article.sourceName || 'Unbekannte Quelle'}
`).join('\n')}

Bitte erstelle eine umfassende, detaillierte Analyse mit mindestens 800-1200 Wörtern. Erkläre die Bedeutung jeder Entwicklung, füge Kontext hinzu und zeige Verbindungen zwischen den verschiedenen Nachrichten auf.`;

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
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 3000,
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
    
    // Add LinkedIn reference if not present and linkedInPage is provided
    if (linkedInPage && !content.includes("linkedin.com/company/linkit-karlsruhe")) {
      content += `\n\n---\n\n**Bleiben Sie verbunden:**\nFür weitere Updates und Diskussionen besuchen Sie unsere [LinkedIn-Seite](${linkedInPage}).`;
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
  
  const prompt = `Du bist ein KI-Experte und fasst Artikel über künstliche Intelligenz prägnant zusammen. Schreibe eine kurze, aber informative Zusammenfassung in 2-3 Sätzen auf Deutsch.

Fasse diesen KI-Artikel zusammen:
              
Titel: ${article.title}
Beschreibung: ${article.description || 'Keine Beschreibung verfügbar'}
Link: ${article.link}`;

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
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 200,
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
