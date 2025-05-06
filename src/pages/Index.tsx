
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import ArticleSelector from "@/components/ArticleSelector";
import WeeklyDigest from "@/components/WeeklyDigest";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RssSourceManager from "@/components/RssSourceManager";
import NewsletterManagement from "@/components/NewsletterManagement";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };
    
    checkAuth();
    
    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Wenn der Authentifizierungsstatus noch nicht festgestellt wurde
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
          <div className="flex justify-center items-center h-[200px]">
            <p>Lade...</p>
          </div>
        </main>
      </div>
    );
  }

  // Wenn der Benutzer nicht authentifiziert ist, zeigen wir eine Nachricht mit Link zur Newsletter-Seite
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-4">KI-News Digest</h1>
            <p className="text-xl mb-8 max-w-2xl">
              Eine wöchentliche Zusammenfassung der wichtigsten KI-Nachrichten
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg">
                <Link to="/newsletter">Newsletter abonnieren</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Wenn der Benutzer authentifiziert ist, zeigen wir die volle Funktionalität
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        <Tabs defaultValue="digest">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-3 w-[400px]">
              <TabsTrigger value="digest">Digest</TabsTrigger>
              <TabsTrigger value="sources">Quellen</TabsTrigger>
              <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="digest" className="space-y-4">
            <ArticleSelector />
            <WeeklyDigest />
          </TabsContent>

          <TabsContent value="sources" className="space-y-4">
            <RssSourceManager />
          </TabsContent>

          <TabsContent value="newsletter" className="space-y-4">
            <NewsletterManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
