
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NewsletterSubscribeCard from "@/components/NewsletterSubscribeCard";
import AdminPanel from "@/components/AdminPanel";

const Newsletter = () => {
  const navigate = useNavigate();
  const [adminMode, setAdminMode] = useState(false);

  // Check login status if not in admin mode
  useState(() => {
    if (adminMode) {
      return; // Skip the authentication check if already in admin mode
    }
    
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/");
      }
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  });

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      {adminMode ? (
        <AdminPanel onExit={() => setAdminMode(false)} />
      ) : (
        <NewsletterSubscribeCard onAdminLogin={() => setAdminMode(true)} />
      )}
    </div>
  );
};

export default Newsletter;
