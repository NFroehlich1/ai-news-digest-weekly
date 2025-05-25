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
  const [apiKey, setApiKey] = useState<string>("AIzaSyAOG3IewUIIsB8oRYG2Lu-_2bM7ZrMBMFk"); // Set default API key
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
  
  // Initialize NewsService using useMemo for a stable instance
  const newsService = useMemo(() => new NewsService(apiKey), [apiKey]); // Pass apiKey to constructor

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

    // Initialize by loading saved API key from localStorage, but keep default if not found
    const savedApiKey = localStorage.getItem('api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    // Set the API key for the service
    newsService.setApiKey(apiKey);

    // Load RSS sources
    if (newsService) {
      const sources = newsService.getRssSources();
      setRssSources(sources);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [newsService, apiKey]); // Add apiKey to dependency array

  // Effect to load news when API key is available
  useEffect(() => {
    if (apiKey && newsService) {
      const loadInitialNews = async () => {
        setIsLoading(true);
        try {
          const items = await newsService.fetchNews();
          setNewsItems(items);
          
          const currentWeekItems = newsService.filterCurrentWeekNews(items);
          const updatedDigest = {
            ...emptyDigest,
            items: currentWeekItems,
          };
          setWeeklyDigest(updatedDigest);
          // toast.success("Nachrichten automatisch geladen!"); // Optional: consider if this is too noisy
        } catch (error) {
          console.error("Error fetching news automatically:", error);
          toast.error("Fehler beim automatischen Laden der Nachrichten.");
        } finally {
          setIsLoading(false);
        }
      };
      loadInitialNews();
    }
  }, [apiKey, newsService, emptyDigest]);

  // Handle API key setting
  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    localStorage.setItem('api_key', key);
    if (newsService) {
      newsService.setApiKey(key);
    }
    toast.success("API-Schlüssel gespeichert!");
  };

  // Handle refresh action
  const handleRefresh = async () => {
    if (!apiKey) {
      toast.error("Bitte geben Sie zuerst einen API-Schlüssel ein.");
      return;
    }
    
    setIsLoading(true);
    try {
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

  // Handle article selection
  const handleArticleSubmit = (articles: RssItem[]) => {
    setSelectedArticles(articles);
    toast.success(`${articles.length} Artikel für die Zusammenfassung ausgewählt`);
  };

  const handleArticleSelectionCancel = () => {
    // Simply do nothing or reset selection if needed
  };

  // Wenn der Authentifizierungsstatus noch nicht festgestellt wurde
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          onApiKeySet={handleApiKeySet} 
          onRefresh={handleRefresh} 
          loading={isLoading}
          defaultApiKey={apiKey}
        />
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
        <Header 
          onApiKeySet={handleApiKeySet} 
          onRefresh={handleRefresh} 
          loading={isLoading}
          defaultApiKey={apiKey}
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

  // Wenn der Benutzer authentifiziert ist, zeigen wir die volle Funktionalität
  return (
    <div className="min-h-screen bg-background">
      <Header 
        onApiKeySet={handleApiKeySet} 
        onRefresh={handleRefresh} 
        loading={isLoading}
        defaultApiKey={apiKey} // Pass current apiKey as default
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
              apiKey={apiKey} // Pass the current apiKey
              newsService={newsService} // Pass the newsService instance
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
