
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client with the Admin key
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

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

    // Redirect to success page
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
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-icon">✓</div>
          <h1>Newsletter-Anmeldung bestätigt!</h1>
          <p>Vielen Dank für die Bestätigung Ihrer E-Mail-Adresse. Sie erhalten ab sofort unseren wöchentlichen KI-Newsletter jeden Dienstagmorgen.</p>
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
