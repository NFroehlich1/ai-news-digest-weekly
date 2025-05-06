
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
    
    if (!supabaseUrl || !supabaseServiceKey) {
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

    // In a real implementation, you would send an actual email here
    // For demonstration purposes, we're just returning the confirmation URL
    console.log(`Would send confirmation email to ${email} with URL: ${confirmUrl}`);

    // For a complete implementation, you would integrate with an email service like SendGrid, Mailgun, or Resend
    // Example placeholder for email sending logic:
    /*
    await sendEmail({
      to: email,
      subject: "Bestätigen Sie Ihr KI-Newsletter-Abonnement",
      html: `
        <h1>Bestätigen Sie Ihr Newsletter-Abonnement</h1>
        <p>Vielen Dank für Ihr Interesse an unserem KI-Newsletter. Bitte klicken Sie auf den folgenden Link, um Ihre E-Mail-Adresse zu bestätigen:</p>
        <p><a href="${confirmUrl}">Newsletter-Abonnement bestätigen</a></p>
        <p>Wenn Sie diese E-Mail nicht angefordert haben, können Sie sie einfach ignorieren.</p>
      `
    });
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation email would be sent", 
        confirmUrl 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
