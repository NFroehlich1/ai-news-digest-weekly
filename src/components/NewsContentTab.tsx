
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Rss, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import WeeklyDigest from "@/components/WeeklyDigest";
import RssSourceManager from "@/components/RssSourceManager";
import NewsService, { WeeklyDigest as WeeklyDigestType } from "@/services/NewsService";
import NewsCardSkeleton from "@/components/NewsCardSkeleton";

interface NewsContentTabProps {
  newsService: NewsService | null;
}

const NewsContentTab = ({ newsService }: NewsContentTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeekDigest, setCurrentWeekDigest] = useState<WeeklyDigestType | null>(null);
  const [allNews, setAllNews] = useState<Record<string, WeeklyDigestType>>({});
  const [loadingStatus, setLoadingStatus] = useState<string>("");

  // Automatically load news on component mount
  useEffect(() => {
    // Load news when the component mounts or when newsService changes
    if (newsService) {
      loadNews();
    }
  }, [newsService]);

  const loadNews = async () => {
    if (!newsService) return;
    setIsLoading(true);
    setLoadingStatus("Initialisiere News-Abruf...");
    
    try {
      // Zeige Fortschritt an
      toast.info("News werden abgerufen...");
      
      // Fetch only from enabled sources
      setLoadingStatus("Rufe RSS-Feeds ab...");
      const news = await newsService.fetchNews();
      
      if (news.length === 0) {
        toast.warning("Keine Artikel gefunden. Bitte aktivieren Sie mindestens eine RSS-Quelle.");
        setIsLoading(false);
        return;
      }
      
      setLoadingStatus("Gruppiere Nachrichten nach Woche...");
      // Group by week
      const weeklyDigests = newsService.groupNewsByWeek(news);
      setAllNews(weeklyDigests);
      
      // Set current week digest if available
      const currentWeekKey = Object.keys(weeklyDigests)[0];
      if (currentWeekKey) {
        setCurrentWeekDigest(weeklyDigests[currentWeekKey]);
        setLoadingStatus("Fertig!");
      }
      
      toast.success(`${news.length} Nachrichten erfolgreich geladen`);
    } catch (error) {
      console.error("Error loading news:", error);
      toast.error(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  const handleRssSourceChange = () => {
    // Reload news after RSS source changes
    if (newsService) {
      loadNews();
    }
  };

  const renderLoadingState = () => {
    return (
      <div className="space-y-4">
        <p className="text-center text-muted-foreground mb-4">
          {loadingStatus || "Nachrichten werden geladen..."}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <NewsCardSkeleton key={i} hasImage={i % 2 === 0} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        {newsService && (
          <RssSourceManager 
            sources={newsService.getRssSources()}
            onAddSource={(url, name) => newsService.addRssSource(url, name)}
            onRemoveSource={(url) => newsService.removeRssSource(url)}
            onToggleSource={(url, enabled) => {
              const result = newsService.toggleRssSource(url, enabled);
              if (result) {
                // If sources changed, clear current digest to force reload
                setCurrentWeekDigest(null);
              }
              return result;
            }}
            onRefresh={() => {
              setCurrentWeekDigest(null);
              handleRssSourceChange();
            }}
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
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Lädt...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Nachrichten neu laden
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              renderLoadingState()
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
                <p className="text-center text-muted-foreground mt-2">
                  Stellen Sie sicher, dass mindestens eine RSS-Quelle aktiviert ist.
                </p>
                <Button 
                  onClick={loadNews}
                  className="mt-6"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Jetzt Nachrichten laden
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewsContentTab;
