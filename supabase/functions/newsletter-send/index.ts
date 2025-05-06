
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

    // Get all confirmed subscribers
    const { data: subscribers, error: fetchError } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("confirmed", true);

    if (fetchError) {
      console.error("Error fetching subscribers:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscribers" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      console.log("No confirmed subscribers found");
      return new Response(
        JSON.stringify({ message: "No confirmed subscribers found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the latest gemini_job with the newsletter content
    const { data: jobsData, error: jobsError } = await supabase
      .from("gemini_jobs")
      .select("result")
      .eq("status", "pending_newsletter")
      .order("created_at", { ascending: false })
      .limit(1);

    if (jobsError || !jobsData || jobsData.length === 0) {
      console.error("Error fetching newsletter content:", jobsError);
      return new Response(
        JSON.stringify({ error: "Newsletter content not found" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const newsletterContent = jobsData[0].result?.content || "No content available for this week's newsletter.";
    const currentDate = new Date().toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric' 
    });

    // Prepare subscriber emails for Brevo API
    const recipients = subscribers.map(subscriber => ({
      email: subscriber.email
    }));

    // Send newsletter using Brevo API
    const brevoUrl = "https://api.brevo.com/v3/smtp/email";
    const payload = {
      sender: {
        name: "AI Newsletter",
        email: "newsletter@example.com" // Use your verified sender email here
      },
      to: recipients,
      subject: `KI-Newsletter vom ${currentDate}`,
      htmlContent: `
        <h1>Wöchentlicher KI-Newsletter</h1>
        <p>Hier sind die neuesten Entwicklungen im Bereich der künstlichen Intelligenz:</p>
        <div>${newsletterContent}</div>
        <p>--<br>Sie erhalten diesen Newsletter, weil Sie sich dafür angemeldet haben. 
           <a href="${supabaseUrl}/functions/v1/newsletter-unsubscribe?email={{params.EMAIL}}">Abmelden</a></p>
      `
    };

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
          JSON.stringify({ error: "Failed to send newsletter", details: result }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`Newsletter sent successfully to ${subscribers.length} subscribers:`, result);

      // Update the job status to complete
      await supabase
        .from("gemini_jobs")
        .update({ status: "completed" })
        .eq("status", "pending_newsletter");

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Newsletter sent to ${subscribers.length} subscribers` 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (emailError) {
      console.error("Error sending newsletter:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send newsletter", details: emailError.message }),
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
