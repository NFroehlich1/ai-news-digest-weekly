
// Edge function for sending emails via Brevo API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Brevo API endpoint
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, senderName, senderEmail } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the email sending attempt for debugging
    console.log(`Attempting to send email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`From: ${senderName} <${senderEmail}>`);
    
    // Get the Brevo API key from environment variables
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY environment variable not set");
    }
    
    // Prepare email payload for Brevo API
    const brevoPayload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: to
        }
      ],
      subject: subject,
      htmlContent: html
    };

    // Send email using Brevo API
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY
      },
      body: JSON.stringify(brevoPayload)
    });
    
    // Parse the response
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(`Email sending failed: ${JSON.stringify(responseData)}`);
    }
    
    console.log("Email sent successfully:", responseData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.messageId || "unknown",
        message: "Email sent successfully via Brevo"
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
