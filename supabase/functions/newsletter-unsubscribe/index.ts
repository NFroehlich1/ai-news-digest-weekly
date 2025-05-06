
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use the provided Brevo API key
const BREVO_API_KEY = "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";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return new Response(
      JSON.stringify({ error: "Email parameter is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://aggkhetcdjmggqjzelgd.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the subscriber first
    const { data: subscriber, error: findError } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (findError) {
      console.error("Error finding subscriber:", findError);
      return new Response(
        JSON.stringify({ error: "Failed to process unsubscribe request" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!subscriber) {
      // Email not found, but we'll show success anyway for privacy
      console.log(`Unsubscribe request for non-existent email: ${email}`);
    } else {
      // Delete the subscriber
      const { error: deleteError } = await supabase
        .from("newsletter_subscribers")
        .delete()
        .eq("email", email);

      if (deleteError) {
        console.error("Error deleting subscriber:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to unsubscribe" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log(`Successfully unsubscribed: ${email}`);

      // Send confirmation email for unsubscribe using Brevo
      try {
        const brevoUrl = "https://api.brevo.com/v3/smtp/email";
        
        const unsubscribeConfirmPayload = {
          sender: {
            name: "KI-Newsletter",
            email: "froehlich.nico@outlook.de" // Updated sender email
          },
          to: [
            {
              email: email,
            }
          ],
          subject: "Abmeldung bestätigt",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Abmeldung bestätigt</h1>
              <p>Sie wurden erfolgreich von unserem KI-Newsletter abgemeldet.</p>
              <p>Wir bedauern, dass Sie uns verlassen. Falls Sie Feedback haben oder uns mitteilen möchten, warum Sie sich abgemeldet haben, antworten Sie einfach auf diese E-Mail.</p>
              <p>Sollten Sie sich in Zukunft wieder für unseren Newsletter interessieren, können Sie sich jederzeit erneut anmelden.</p>
              <p>Mit freundlichen Grüßen,<br>Das Newsletter-Team</p>
            </div>
          `
        };

        const response = await fetch(brevoUrl, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "api-key": BREVO_API_KEY
          },
          body: JSON.stringify(unsubscribeConfirmPayload)
        });

        console.log("Unsubscribe confirmation email API response status:", response.status);
      } catch (unsubscribeEmailError) {
        // Just log the error but continue with the unsubscribe process
        console.error("Error sending unsubscribe confirmation email:", unsubscribeEmailError);
      }
    }

    // Return a success HTML page
    return new Response(
      `<!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Newsletter Abmeldung</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .success-container {
            text-align: center;
            padding: 40px 20px;
            border-radius: 8px;
            background-color: #f9f9f9;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-top: 40px;
          }
          .success-icon {
            color: #22c55e;
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 16px;
          }
          p {
            font-size: 16px;
            color: #555;
          }
          .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            margin-top: 20px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-icon">✓</div>
          <h1>Abmeldung erfolgreich</h1>
          <p>Sie wurden erfolgreich von unserem Newsletter abgemeldet.</p>
          <p>Wir bedauern, dass Sie uns verlassen. Vielen Dank für Ihr bisheriges Interesse!</p>
          <a href="/" class="button">Zur Startseite</a>
        </div>
      </body>
      </html>`,
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
