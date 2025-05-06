
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey || !brevoApiKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get subscriber data with confirmation token
    const { data: subscribers, error: fetchError } = await supabase
      .from("newsletter_subscribers")
      .select("confirmation_token")
      .eq("email", email)
      .limit(1);

    if (fetchError || !subscribers || subscribers.length === 0) {
      console.error("Error fetching subscriber:", fetchError);
      return new Response(
        JSON.stringify({ error: "Subscriber not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const confirmationToken = subscribers[0].confirmation_token;
    const confirmUrl = `${supabaseUrl}/functions/v1/newsletter-confirm?token=${confirmationToken}`;

    // Send confirmation email using Brevo API
    const brevoUrl = "https://api.brevo.com/v3/smtp/email";
    const payload = {
      sender: {
        name: "AI Newsletter",
        email: "newsletter@example.com" // Use your verified sender email here
      },
      to: [
        {
          email: email,
        }
      ],
      subject: "Bestätigen Sie Ihr KI-Newsletter-Abonnement",
      htmlContent: `
        <h1>Bestätigen Sie Ihr Newsletter-Abonnement</h1>
        <p>Vielen Dank für Ihr Interesse an unserem KI-Newsletter. Bitte klicken Sie auf den folgenden Link, um Ihre E-Mail-Adresse zu bestätigen:</p>
        <p><a href="${confirmUrl}">Newsletter-Abonnement bestätigen</a></p>
        <p>Wenn Sie diese E-Mail nicht angefordert haben, können Sie sie einfach ignorieren.</p>
      `
    };

    console.log(`Sending confirmation email to ${email} with URL: ${confirmUrl}`);

    try {
      const response = await fetch(brevoUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "api-key": brevoApiKey
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error("Brevo API error:", result);
        return new Response(
          JSON.stringify({ error: "Failed to send confirmation email", details: result }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Confirmation email sent successfully:", result);

      return new Response(
        JSON.stringify({ success: true, message: "Confirmation email sent" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
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
