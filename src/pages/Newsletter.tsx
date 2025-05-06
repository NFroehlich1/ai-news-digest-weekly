
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock } from "lucide-react";
import NewsletterSubscribeForm from "@/components/NewsletterSubscribeForm";
import NewsletterManagement from "@/components/NewsletterManagement";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// The admin password - in a production environment, this should be stored securely
const ADMIN_PASSWORD = "Test_1082?!";

const Newsletter = () => {
  const navigate = useNavigate();
  const [adminMode, setAdminMode] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simple password check
    if (password === ADMIN_PASSWORD) {
      setAdminMode(true);
      setShowAdminLogin(false);
      toast.success("Administrator-Modus aktiviert");
    } else {
      toast.error("Falsches Passwort");
    }
    
    setPassword("");
    setIsSubmitting(false);
  };

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {adminMode ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Newsletter-Verwaltung</h1>
            <Button 
              variant="outline" 
              onClick={() => setAdminMode(false)}
            >
              Zurück zum Abonnieren
            </Button>
          </div>
          <NewsletterManagement />
        </div>
      ) : (
        <>
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
              {showAdminLogin ? (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Administrator-Passwort</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9"
                        placeholder="Geben Sie das Administrator-Passwort ein"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowAdminLogin(false)}
                    >
                      Abbrechen
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Prüfe..." : "Anmelden"}
                    </Button>
                  </div>
                </form>
              ) : (
                <NewsletterSubscribeForm />
              )}
            </CardContent>
            <CardFooter className="flex flex-col text-sm text-muted-foreground">
              <p className="text-center mb-2">
                Wir versenden unseren Newsletter einmal pro Woche.
              </p>
              <p className="text-center">
                Sie können sich jederzeit vom Newsletter abmelden.
              </p>
              {!showAdminLogin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-xs text-muted-foreground"
                  onClick={() => setShowAdminLogin(true)}
                >
                  Administrator-Zugang
                </Button>
              )}
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
};

export default Newsletter;
