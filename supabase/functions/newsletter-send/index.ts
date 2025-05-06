
// Edge function for newsletter sending with Supabase
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
    // Parse request body
    let newsletterConfig = {};
    try {
      newsletterConfig = await req.json();
    } catch (e) {
      // Default empty object if no body
    }

    const {
      subject = `KI-Newsletter vom ${new Date().toLocaleDateString('de-DE')}`,
      customContent = null,
      senderName = "KI-Newsletter",
      senderEmail = "froehlich.nico@outlook.de" // Updated sender email
    } = newsletterConfig;

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

    // Get confirmed subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("confirmed", true);

    if (subscribersError) {
      console.error("Error fetching subscribers:", subscribersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscribers" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No confirmed subscribers found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Default HTML content for the newsletter
    let htmlContent = customContent;
    
    // If no custom content is provided, use default template
    if (!htmlContent) {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">${senderName}</h1>
          <p>Willkommen zu unserem wöchentlichen KI-Newsletter.</p>
          <p>Hier sind die wichtigsten Neuigkeiten aus der Welt der Künstlichen Intelligenz:</p>
          <ul>
            <li>GPT-5 soll in den nächsten Monaten erscheinen</li>
            <li>Google stellt neue KI-Funktionen für Workspace vor</li>
            <li>EU einigt sich auf KI-Regulierung</li>
          </ul>
          <p style="margin-top: 30px; font-size: 14px; color: #777;">
            Sie erhalten diesen Newsletter, weil Sie sich dafür angemeldet haben. 
            <a href="{{{unsubscribe}}}" style="color: #777;">Hier abmelden</a>
          </p>
        </div>
      `;
    }

    // Store email sending attempts for tracking and debugging
    const successfulSends = [];
    const failedSends = [];
    
    // Send emails to all subscribers
    for (const subscriber of subscribers) {
      try {
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/newsletter-unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
        
        // Replace {{{unsubscribe}}} placeholder with actual unsubscribe URL
        const personalizedContent = htmlContent.replace("{{{unsubscribe}}}", unsubscribeUrl);
        
        // Log the email sending attempt for debugging
        console.log(`Sending newsletter to: ${subscriber.email}`);
        console.log(`Subject: ${subject}`);
        console.log(`From: ${senderName} <${senderEmail}>`);
        
        // Call the newsletter-send-email function to send email
        const emailResponse = await supabase.functions.invoke('newsletter-send-email', {
          body: {
            to: subscriber.email,
            subject: subject,
            html: personalizedContent,
            senderName: senderName,
            senderEmail: senderEmail
          }
        });
        
        if (emailResponse.error) {
          throw new Error(emailResponse.error);
        }
        
        const emailData = emailResponse.data;
        
        if (emailData.success) {
          successfulSends.push(subscriber.email);
          console.log(`Email sent successfully to ${subscriber.email}`);
        } else {
          throw new Error(emailData.message || "Unknown error");
        }
      } catch (error) {
        console.error(`Error sending to ${subscriber.email}:`, error);
        failedSends.push({ email: subscriber.email, error: error.message });
      }
    }
    
    // Store the newsletter in the database
    try {
      const { error: insertError } = await supabase
        .from('newsletters')
        .insert({
          subject: subject,
          content: htmlContent,
          sender_name: senderName,
          sender_email: senderEmail,
          sent_at: new Date().toISOString(),
          recipients_count: subscribers.length
        });
        
      if (insertError) {
        console.error("Error storing newsletter:", insertError);
      }
    } catch (error) {
      console.error("Error storing newsletter:", error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Newsletter sent to ${successfulSends.length} subscribers`,
        emailsSent: successfulSends.length,
        totalSubscribers: subscribers.length,
        successfulSends,
        failedSends
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
