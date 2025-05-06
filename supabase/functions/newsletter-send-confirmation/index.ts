
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
    
    // Use Supabase Auth's email sending capability
    // Note: This is a workaround as Supabase doesn't have a direct email API
    // We'll use the auth.admin.generateLink method which is designed for auth emails but can be repurposed
    const { data: emailData, error: emailError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: confirmUrl
      }
    });
    
    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send confirmation email", details: emailError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Email link generated successfully");
    
    // Fix: Removed the problematic "process.env.NODE_ENV" check
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
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
