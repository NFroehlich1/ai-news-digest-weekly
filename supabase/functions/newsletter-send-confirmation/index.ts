
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
    
    // Get the Brevo API key from environment variables
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    
    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY not found in environment variables");
      return new Response(
        JSON.stringify({ error: "Email service configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Send confirmation email using Brevo API directly
    try {
      const brevoUrl = "https://api.brevo.com/v3/smtp/email";
      
      const confirmPayload = {
        sender: {
          name: "KI-Newsletter",
          email: "froehlich.nico@outlook.de" // Updated sender email
        },
        to: [
          {
            email: email
          }
        ],
        subject: "Bitte bestätigen Sie Ihre E-Mail-Adresse",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bestätigen Sie Ihre E-Mail-Adresse</h1>
            <p>Vielen Dank für Ihre Anmeldung zu unserem KI-Newsletter!</p>
            <p>Um Ihre Anmeldung abzuschließen, klicken Sie bitte auf den folgenden Link:</p>
            <p style="margin: 25px 0;">
              <a href="${confirmUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">E-Mail-Adresse bestätigen</a>
            </p>
            <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
            <p style="word-break: break-all; color: #1a73e8;">${confirmUrl}</p>
            <p style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 15px;">
              Falls Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren.
            </p>
          </div>
        `
      };
      
      console.log("Attempting to send confirmation email to:", email);
      
      const response = await fetch(brevoUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "api-key": BREVO_API_KEY
        },
        body: JSON.stringify(confirmPayload)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error("Error response from Brevo API:", responseData);
        throw new Error(`Brevo API error: ${JSON.stringify(responseData)}`);
      }
      
      console.log("Confirmation email sent successfully:", responseData);
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send confirmation email", details: emailError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return success response with dev info
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation email sent",
        // Include the link for testing purposes
        devInfo: { confirmUrl }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
