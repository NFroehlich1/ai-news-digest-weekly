
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Rss, Calendar } from "lucide-react";
import NewsletterSubscribeForm from "@/components/NewsletterSubscribeForm";
import NewsletterManagement from "@/components/NewsletterManagement";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import WeeklyDigest from "@/components/WeeklyDigest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NewsService, { WeeklyDigest as WeeklyDigestType } from "@/services/NewsService";
import RssSourceManager from "@/components/RssSourceManager";

// The admin password - in a production environment, this should be stored securely
const ADMIN_PASSWORD = "Test_1082?!";

const Newsletter = () => {
  const navigate = useNavigate();
  const [adminMode, setAdminMode] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>("manage");
  const [isLoading, setIsLoading] = useState(false);
  const [newsService, setNewsService] = useState<NewsService | null>(null);
  const [currentWeekDigest, setCurrentWeekDigest] = useState<WeeklyDigestType | null>(null);
  const [allNews, setAllNews] = useState<Record<string, WeeklyDigestType>>({});

  // Initialize NewsService
  useEffect(() => {
    const service = new NewsService();
    setNewsService(service);
  }, []);

  // Only check login status if not in admin mode
  useEffect(() => {
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
  }, [navigate, adminMode]);

  // Load news when in admin mode and the "news" tab is selected
  useEffect(() => {
    if (adminMode && currentTab === "news" && newsService) {
      loadNews();
    }
  }, [adminMode, currentTab, newsService]);

  const loadNews = async () => {
    if (!newsService) return;
    setIsLoading(true);
    
    try {
      // Fetch all news
      const news = await newsService.fetchNews();
      
      // Group by week
      const weeklyDigests = newsService.groupNewsByWeek(news);
      setAllNews(weeklyDigests);
      
      // Set current week digest if available
      const currentWeekKey = Object.keys(weeklyDigests)[0];
      if (currentWeekKey) {
        setCurrentWeekDigest(weeklyDigests[currentWeekKey]);
      }
      
      toast.success("Nachrichten erfolgreich geladen");
    } catch (error) {
      console.error("Error loading news:", error);
      toast.error(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleRssSourceChange = () => {
    // Reload news after RSS source changes
    if (newsService) {
      loadNews();
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      {adminMode ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl font-bold">Newsletter-Verwaltung</h1>
            <Button 
              variant="outline" 
              onClick={() => setAdminMode(false)}
            >
              Zurück zum Abonnieren
            </Button>
          </div>
          
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="manage">Newsletter-Versand</TabsTrigger>
              <TabsTrigger value="news">KI-News-Generator</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manage" className="space-y-6">
              <NewsletterManagement />
            </TabsContent>
            
            <TabsContent value="news" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  {newsService && (
                    <RssSourceManager 
                      sources={newsService.getRssSources()}
                      onAddSource={(url, name) => newsService.addRssSource(url, name)}
                      onRemoveSource={(url) => newsService.removeRssSource(url)}
                      onToggleSource={(url, enabled) => newsService.toggleRssSource(url, enabled)}
                      onRefresh={handleRssSourceChange}
                    />
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          KI-News-Zusammenfassung
                        </CardTitle>
                        <CardDescription>
                          Aktuelle Nachrichten laden und als Newsletter zusammenfassen
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={loadNews} 
                        disabled={isLoading}
                      >
                        {isLoading ? "Lädt..." : "Nachrichten laden"}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="flex justify-center py-8">
                          <p>Nachrichten werden geladen...</p>
                        </div>
                      ) : currentWeekDigest ? (
                        <WeeklyDigest 
                          digest={currentWeekDigest} 
                          apiKey={newsService?.getDefaultApiKey() || ""}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Rss className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-center text-muted-foreground">
                            Keine aktuellen Nachrichten verfügbar. Klicken Sie auf "Nachrichten laden", 
                            um die neuesten Artikel zu laden.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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

