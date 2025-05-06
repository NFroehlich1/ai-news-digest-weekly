
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client with the Admin key
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://aggkhetcdjmggqjzelgd.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Use the provided Brevo API key
const BREVO_API_KEY = "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";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  console.log(`Processing confirmation with token: ${token}`);

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Confirmation token is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Update subscriber status
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .update({ confirmed: true })
      .match({ confirmation_token: token })
      .select("email");

    if (error) {
      console.error("Error confirming subscription:", error);
      return new Response(
        JSON.stringify({ error: "Failed to confirm subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired confirmation token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Successfully confirmed subscription for email: ${data[0].email}`);

    // Send welcome email using Brevo API
    try {
      const brevoUrl = "https://api.brevo.com/v3/smtp/email";
      
      const welcomePayload = {
        sender: {
          name: "KI-Newsletter",
          email: "froehlich.nico@outlook.de" // Updated sender email
        },
        to: [
          {
            email: data[0].email,
          }
        ],
        subject: "Willkommen bei unserem KI-Newsletter",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Willkommen bei unserem KI-Newsletter!</h1>
            <p>Herzlich Willkommen! Sie sind nun erfolgreich für unseren wöchentlichen KI-Newsletter angemeldet.</p>
            <p>Ab sofort erhalten Sie jeden Dienstagmorgen die wichtigsten Nachrichten und Entwicklungen aus der Welt der künstlichen Intelligenz.</p>
            <p>Wir freuen uns, Sie als Abonnent begrüßen zu dürfen!</p>
            <p>Mit freundlichen Grüßen,<br>Das Newsletter-Team</p>
            <p style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 15px;">
              Sie können sich jederzeit <a href="${supabaseUrl}/functions/v1/newsletter-unsubscribe?email=${encodeURIComponent(data[0].email)}" style="color: #777;">hier abmelden</a>.
            </p>
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
        body: JSON.stringify(welcomePayload)
      });

      console.log("Welcome email API response status:", response.status);
    } catch (welcomeEmailError) {
      // Just log the error but continue with the confirmation
      console.error("Error sending welcome email:", welcomeEmailError);
    }

    // Return a success HTML page
    return new Response(
      `<!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Newsletter Bestätigung</title>
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
          <h1>Newsletter-Anmeldung bestätigt!</h1>
          <p>Vielen Dank für die Bestätigung Ihrer E-Mail-Adresse. Sie erhalten ab sofort unseren wöchentlichen KI-Newsletter jeden Dienstagmorgen.</p>
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
