
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import WeeklyDigest from "@/components/WeeklyDigest";
import RssSourceManager from "@/components/RssSourceManager";
import NewsCardSkeleton from "@/components/NewsCardSkeleton";
import NewsService, { WeeklyDigest as WeeklyDigestType, RssItem, RssSource } from "@/services/NewsService";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Rss, AlertCircle, RefreshCw, Bug } from "lucide-react";
import DecoderService from "@/services/DecoderService";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const decoderService = new DecoderService();
  const defaultApiKey = decoderService.getDefaultApiKey();
  const newsService = new NewsService();
  
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("decoder_api_key") || defaultApiKey;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [news, setNews] = useState<RssItem[]>([]);
  const [currentWeekNews, setCurrentWeekNews] = useState<RssItem[]>([]);
  const [weeklyDigests, setWeeklyDigests] = useState<Record<string, WeeklyDigestType>>({});
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState<boolean>(() => {
    return localStorage.getItem("use_mock_data") === "true";
  });
  const [rssSources, setRssSources] = useState<RssSource[]>(newsService.getRssSources());
  const [activeTab, setActiveTab] = useState<string>("news");
  
  // Save API key to local storage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("decoder_api_key", apiKey);
    }
  }, [apiKey]);
  
  // Save mock data preference
  useEffect(() => {
    localStorage.setItem("use_mock_data", String(useMockData));
  }, [useMockData]);
  
  // Load news on first render and when API key changes
  useEffect(() => {
    console.log("Loading news with API key:", apiKey ? "API key set" : "No API key");
    fetchNews();
  }, [apiKey, useMockData]);
  
  // Add RSS source
  const handleAddRssSource = (url: string, name: string): boolean => {
    const result = newsService.addRssSource(url, name);
    if (result) {
      setRssSources(newsService.getRssSources());
    }
    return result;
  };
  
  // Remove RSS source
  const handleRemoveRssSource = (url: string): boolean => {
    const result = newsService.removeRssSource(url);
    if (result) {
      setRssSources(newsService.getRssSources());
    }
    return result;
  };
  
  // Toggle RSS source enabled/disabled state
  const handleToggleRssSource = (url: string, enabled: boolean): boolean => {
    const result = newsService.toggleRssSource(url, enabled);
    if (result) {
      setRssSources(newsService.getRssSources());
    }
    return result;
  };
  
  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching news...");
      newsService.setApiKey(apiKey);
      newsService.setUseMockData(useMockData);
      
      const items = await newsService.fetchNews();
      
      if (items && items.length > 0) {
        console.log(`Loaded ${items.length} news items`);
        setNews(items);
        
        // Filter for current week news
        const currentWeekItems = newsService.filterCurrentWeekNews(items);
        setCurrentWeekNews(currentWeekItems);
        console.log(`Filtered ${currentWeekItems.length} items for current week`);
        
        // Group by week
        const digests = newsService.groupNewsByWeek(items);
        setWeeklyDigests(digests);
        
        if (useMockData) {
          toast.success(`${items.length} Demo-Nachrichten geladen`);
        } else {
          toast.success(`${items.length} Nachrichten geladen`);
        }
        
        setActiveTab("news");
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
  
  // Toggle mock data
  const handleToggleMockData = () => {
    setUseMockData(prev => !prev);
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
          <div className="mt-4 text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Switch 
                id="mock-data" 
                checked={useMockData}
                onCheckedChange={handleToggleMockData}
              />
              <Label htmlFor="mock-data" className="flex items-center gap-1">
                <Bug className="h-4 w-4" />
                Demo-Daten verwenden
              </Label>
            </div>
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
        {useMockData && (
          <Alert className="mb-4">
            <Bug className="h-4 w-4" />
            <AlertTitle>Demo-Modus aktiv</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span>Es werden Demo-Daten anstelle von echten RSS-Feeds verwendet.</span>
              <div className="flex items-center gap-2">
                <Switch 
                  id="toggle-mock" 
                  checked={useMockData}
                  onCheckedChange={handleToggleMockData}
                />
                <Label htmlFor="toggle-mock">Demo-Modus deaktivieren</Label>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : Object.keys(weeklyDigests).length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-2">Keine Nachrichten gefunden</h2>
            <p className="text-muted-foreground mb-4">
              Bitte überprüfen Sie Ihre RSS-Quellen oder versuchen Sie es später erneut.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Switch 
                  id="mock-data-empty" 
                  checked={useMockData}
                  onCheckedChange={handleToggleMockData}
                />
                <Label htmlFor="mock-data-empty" className="flex items-center gap-1">
                  <Bug className="h-4 w-4" />
                  Demo-Daten verwenden
                </Label>
              </div>
              <Button 
                onClick={fetchNews}
                className="inline-flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Erneut versuchen
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="news">Nachrichten</TabsTrigger>
                <TabsTrigger value="sources">RSS-Quellen</TabsTrigger>
              </TabsList>
              
              <TabsContent value="news">
                {renderWeeklyDigests()}
              </TabsContent>
              
              <TabsContent value="sources">
                <RssSourceManager
                  sources={rssSources}
                  onAddSource={handleAddRssSource}
                  onRemoveSource={handleRemoveRssSource}
                  onToggleSource={handleToggleRssSource}
                  onRefresh={fetchNews}
                />
              </TabsContent>
            </Tabs>
          </div>
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
