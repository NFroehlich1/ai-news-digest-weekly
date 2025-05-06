
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import NewsletterSubscribeForm from "@/components/NewsletterSubscribeForm";
import { supabase } from "@/integrations/supabase/client";

const Newsletter = () => {
  const navigate = useNavigate();

  // Überprüfen, ob der Benutzer angemeldet ist und umleiten, falls ja
  useEffect(() => {
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
  }, [navigate]);

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-primary/10 p-3 w-fit">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">KI-Newsletter abonnieren</CardTitle>
          <CardDescription>
            Erhalten Sie jeden Dienstag die wichtigsten KI-Nachrichten direkt in Ihrem Postfach.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewsletterSubscribeForm />
        </CardContent>
        <CardFooter className="flex flex-col text-sm text-muted-foreground">
          <p className="text-center mb-2">
            Wir versenden unseren Newsletter einmal pro Woche.
          </p>
          <p className="text-center">
            Sie können sich jederzeit vom Newsletter abmelden.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Newsletter;
