import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import ArticleSelector from "@/components/ArticleSelector";
import WeeklyDigest from "@/components/WeeklyDigest";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RssSourceManager from "@/components/RssSourceManager";
import NewsletterManagement from "@/components/NewsletterManagement";
import { supabase } from "@/integrations/supabase/client";
import NewsService, { RssItem, WeeklyDigest as WeeklyDigestType } from "@/services/NewsService";
import { toast } from "sonner";
import { getWeekDateRange, getCurrentWeek, getCurrentYear } from "@/utils/dateUtils";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rssSources, setRssSources] = useState<any[]>([]);
  const [newsItems, setNewsItems] = useState<RssItem[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<RssItem[]>([]);
  
  // Create empty digest for initial state
  const emptyDigest: WeeklyDigestType = {
    id: `${getCurrentYear()}-W${getCurrentWeek()}`,
    weekNumber: getCurrentWeek(),
    year: getCurrentYear(),
    dateRange: getWeekDateRange(getCurrentWeek(), getCurrentYear()),
    title: `KI-Update KW ${getCurrentWeek()} · ${getWeekDateRange(getCurrentWeek(), getCurrentYear())}`,
    summary: `Die wichtigsten KI-Nachrichten der Woche ${getCurrentWeek()}`,
    items: [],
    createdAt: new Date()
  };
  
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigestType>(emptyDigest);
  
  // Initialize NewsService using useMemo - no API key needed anymore
  const newsService = useMemo(() => {
    console.log("Creating NewsService with Supabase integration");
    return new NewsService();
  }, []);

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

    // Load RSS sources
    const sources = newsService.getRssSources();
    setRssSources(sources);

    return () => {
      subscription.unsubscribe();
    };
  }, [newsService]);

  // Effect to load initial news when NewsService is ready
  useEffect(() => {
    const loadInitialNews = async () => {
      setIsLoading(true);
      try {
        console.log("Loading initial news with Supabase integration");
        const items = await newsService.fetchNews();
        setNewsItems(items);
        
        const currentWeekItems = newsService.filterCurrentWeekNews(items);
        const updatedDigest = {
          ...emptyDigest,
          items: currentWeekItems,
        };
        setWeeklyDigest(updatedDigest);
        console.log("Initial news loading completed, articles:", items.length);
      } catch (error) {
        console.error("Error fetching news automatically:", error);
        toast.error("Fehler beim automatischen Laden der Nachrichten.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (newsService) {
      loadInitialNews();
    }
  }, [newsService, emptyDigest]);

  // Handle API key setting (now just a compatibility function)
  const handleApiKeySet = (key: string) => {
    console.log("API key setting triggered - using Supabase integration");
    toast.success("Verwendet Supabase für sichere API-Schlüssel-Verwaltung!");
  };

  // Handle refresh action
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      console.log("Refreshing news with Supabase integration");
      const items = await newsService.fetchNews();
      setNewsItems(items);
      
      // Update weekly digest with current week's news
      const currentWeekItems = newsService.filterCurrentWeekNews(items);
      const updatedDigest = {
        ...emptyDigest,
        items: currentWeekItems,
      };
      setWeeklyDigest(updatedDigest);
      
      toast.success("Nachrichten erfolgreich aktualisiert!");
    } catch (error) {
      console.error("Error fetching news:", error);
      toast.error("Fehler beim Laden der Nachrichten.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle article selection
  const handleArticleSubmit = (articles: RssItem[]) => {
    setSelectedArticles(articles);
    toast.success(`${articles.length} Artikel für die Zusammenfassung ausgewählt`);
  };

  const handleArticleSelectionCancel = () => {
    // Simply do nothing or reset selection if needed
  };

  // Handle RSS source management
  const handleAddSource = (url: string, name: string): boolean => {
    const result = newsService.addRssSource(url, name);
    if (result) {
      const sources = newsService.getRssSources();
      setRssSources(sources);
    }
    return result;
  };

  const handleRemoveSource = (url: string): boolean => {
    const result = newsService.removeRssSource(url);
    if (result) {
      const sources = newsService.getRssSources();
      setRssSources(sources);
    }
    return result;
  };

  const handleToggleSource = (url: string, enabled: boolean): boolean => {
    const result = newsService.toggleRssSource(url, enabled);
    if (result) {
      const sources = newsService.getRssSources();
      setRssSources(sources);
    }
    return result;
  };

  // Wenn der Authentifizierungsstatus noch nicht festgestellt wurde
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          onApiKeySet={handleApiKeySet} 
          onRefresh={handleRefresh} 
          loading={isLoading}
        />
        <main className="container max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
          <div className="flex justify-center items-center h-[200px]">
            <p>Lade...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          onApiKeySet={handleApiKeySet} 
          onRefresh={handleRefresh} 
          loading={isLoading}
        />
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

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onApiKeySet={handleApiKeySet} 
        onRefresh={handleRefresh} 
        loading={isLoading}
      />
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
            <ArticleSelector 
              articles={weeklyDigest.items}
              onSubmit={handleArticleSubmit}
              onCancel={handleArticleSelectionCancel}
            />
            <WeeklyDigest 
              digest={weeklyDigest}
              apiKey="configured-in-supabase"
              newsService={newsService}
            />
          </TabsContent>

          <TabsContent value="sources" className="space-y-4">
            <RssSourceManager 
              sources={rssSources}
              onAddSource={handleAddSource}
              onRemoveSource={handleRemoveSource}
              onToggleSource={handleToggleSource}
              onRefresh={handleRefresh}
            />
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
