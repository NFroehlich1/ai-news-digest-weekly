
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

    // Check if email already exists and is confirmed
    const { data: existingUser, error: existingError } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing subscriber:", existingError);
      return new Response(
        JSON.stringify({ error: "Error checking subscription status" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (existingUser?.confirmed) {
      return new Response(
        JSON.stringify({ message: "Email already confirmed" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get subscriber data with confirmation token or create new subscriber
    let confirmationToken;
    
    if (existingUser) {
      confirmationToken = existingUser.confirmation_token;
    } else {
      // Insert new subscriber
      const { data: newUser, error: insertError } = await supabase
        .from("newsletter_subscribers")
        .insert([{ email }])
        .select()
        .single();
      
      if (insertError) {
        console.error("Error inserting subscriber:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create subscription" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      confirmationToken = newUser.confirmation_token;
    }

    const confirmUrl = `${supabaseUrl}/functions/v1/newsletter-confirm?token=${confirmationToken}`;
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/newsletter-unsubscribe?email=${encodeURIComponent(email)}`;

    // Send confirmation email using Brevo API
    const brevoUrl = "https://api.brevo.com/v3/smtp/email";
    const payload = {
      sender: {
        name: "KI-Newsletter",
        email: "newsletter@decoderproject.com" // Replace with your verified sender
      },
      to: [
        {
          email: email,
        }
      ],
      subject: "Bestätigen Sie Ihr KI-Newsletter-Abonnement",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bestätigen Sie Ihr Newsletter-Abonnement</h1>
          <p>Vielen Dank für Ihr Interesse an unserem KI-Newsletter.</p>
          <p>Bitte klicken Sie auf den folgenden Button, um Ihre E-Mail-Adresse zu bestätigen:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Newsletter-Abonnement bestätigen</a>
          </p>
          <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
          <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${confirmUrl}</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">Wenn Sie diese E-Mail nicht angefordert haben, können Sie sie einfach ignorieren oder <a href="${unsubscribeUrl}" style="color: #777;">hier klicken</a>, um sich abzumelden.</p>
        </div>
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
