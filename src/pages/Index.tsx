
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import WeeklyDigest from "@/components/WeeklyDigest";
import NewsCardSkeleton from "@/components/NewsCardSkeleton";
import NewsService, { WeeklyDigest as WeeklyDigestType, RssItem } from "@/services/NewsService";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Rss } from "lucide-react";

const Index = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("decoder_api_key") || "";
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [news, setNews] = useState<RssItem[]>([]);
  const [weeklyDigests, setWeeklyDigests] = useState<Record<string, WeeklyDigestType>>({});
  
  // Save API key to local storage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("decoder_api_key", apiKey);
    }
  }, [apiKey]);
  
  // Load news on first render and when API key changes
  useEffect(() => {
    if (apiKey) {
      fetchNews();
    } else {
      setLoading(false);
    }
  }, [apiKey]);
  
  const fetchNews = async () => {
    setLoading(true);
    
    try {
      const newsService = new NewsService(apiKey);
      const items = await newsService.fetchNews();
      
      if (items.length > 0) {
        setNews(items);
        const digests = newsService.groupNewsByWeek(items);
        setWeeklyDigests(digests);
        toast.success(`${items.length} Nachrichten geladen`);
      } else {
        toast.error("Keine Nachrichten gefunden");
      }
    } catch (error) {
      console.error("Error fetching news:", error);
      toast.error(`Fehler: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial API key setup
  const handleApiKeySet = (newApiKey: string) => {
    setApiKey(newApiKey);
  };
  
  // Pre-initialize with a default API key if available
  useEffect(() => {
    const defaultApiKey = "AIzaSyCp8HTHYf3lN7jwzVYfoBOAkcEgqkJ7jxY";
    if (!apiKey && defaultApiKey) {
      setApiKey(defaultApiKey);
    }
  }, []);
  
  // Render loading state
  const renderLoading = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, index) => (
          <NewsCardSkeleton key={index} />
        ))}
      </div>
    );
  };
  
  // Render API key prompt
  const renderApiKeyPrompt = () => {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="pt-6">
          <Alert>
            <Rss className="h-4 w-4" />
            <AlertTitle>API-Schlüssel erforderlich</AlertTitle>
            <AlertDescription>
              Bitte setzen Sie einen API-Schlüssel, um Nachrichten laden zu können.
              Klicken Sie auf "API-Schlüssel setzen" oben rechts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  };
  
  // Render weekly digests
  const renderWeeklyDigests = () => {
    const sortedKeys = Object.keys(weeklyDigests).sort().reverse();
    
    return sortedKeys.map(key => (
      <WeeklyDigest 
        key={key} 
        digest={weeklyDigests[key]} 
        apiKey={apiKey} 
      />
    ));
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header 
        onApiKeySet={handleApiKeySet} 
        onRefresh={fetchNews} 
        loading={loading} 
      />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        {loading ? (
          renderLoading()
        ) : !apiKey ? (
          renderApiKeyPrompt()
        ) : Object.keys(weeklyDigests).length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-2">Keine Nachrichten gefunden</h2>
            <p className="text-muted-foreground">
              Bitte überprüfen Sie Ihren API-Schlüssel oder versuchen Sie es später erneut.
            </p>
          </div>
        ) : (
          renderWeeklyDigests()
        )}
      </main>
      
      <footer className="border-t bg-card py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 KI News Digest - Powered by The Decoder</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
