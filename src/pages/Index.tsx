import { useState, useEffect } from "react";
import Header from "@/components/Header";
import WeeklyDigest from "@/components/WeeklyDigest";
import NewsCardSkeleton from "@/components/NewsCardSkeleton";
import NewsService, { WeeklyDigest as WeeklyDigestType, RssItem } from "@/services/NewsService";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Rss, AlertCircle, RefreshCw } from "lucide-react";
import DecoderService from "@/services/DecoderService";
import { Button } from "@/components/ui/button";

const Index = () => {
  const decoderService = new DecoderService();
  const defaultApiKey = decoderService.getDefaultApiKey();
  
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("decoder_api_key") || defaultApiKey;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [news, setNews] = useState<RssItem[]>([]);
  const [weeklyDigests, setWeeklyDigests] = useState<Record<string, WeeklyDigestType>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Save API key to local storage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("decoder_api_key", apiKey);
    }
  }, [apiKey]);
  
  // Load news on first render and when API key changes
  useEffect(() => {
    console.log("Loading news with API key:", apiKey ? "API key set" : "No API key");
    fetchNews();
  }, [apiKey]);
  
  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching news...");
      const newsService = new NewsService(apiKey);
      const items = await newsService.fetchNews();
      
      if (items && items.length > 0) {
        console.log(`Loaded ${items.length} news items`);
        setNews(items);
        const digests = newsService.groupNewsByWeek(items);
        setWeeklyDigests(digests);
        toast.success(`${items.length} Nachrichten geladen`);
      } else {
        console.error("No news items returned");
        setError("Keine Nachrichten konnten geladen werden. Bitte versuchen Sie es später erneut.");
        toast.error("Keine Nachrichten gefunden");
      }
    } catch (error) {
      console.error("Error fetching news:", error);
      setError(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
      toast.error(`Fehler: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial API key setup
  const handleApiKeySet = (newApiKey: string) => {
    setApiKey(newApiKey);
  };
  
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
  
  // Render error message
  const renderError = () => {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fehler beim Laden</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={fetchNews} variant="outline" className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Erneut versuchen
            </Button>
          </div>
        </CardContent>
      </Card>
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
              Klicken Sie auf "API-Schlüssel anzeigen" oben rechts.
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
        defaultApiKey={defaultApiKey}
      />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        {loading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : Object.keys(weeklyDigests).length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-2">Keine Nachrichten gefunden</h2>
            <p className="text-muted-foreground mb-4">
              Bitte überprüfen Sie Ihren API-Schlüssel oder versuchen Sie es später erneut.
            </p>
            <Button 
              onClick={fetchNews}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Erneut versuchen
            </Button>
          </div>
        ) : (
          renderWeeklyDigests()
        )}
      </main>
      
      <footer className="border-t bg-card py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            © 2025 KI News Digest - Powered by{" "}
            <a 
              href="https://the-decoder.de/" 
              className="font-medium underline underline-offset-4" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              The Decoder
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
