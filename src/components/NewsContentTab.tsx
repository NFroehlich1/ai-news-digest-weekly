
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Rss, RefreshCw, BarChart3, TrendingUp, AlertCircle } from "lucide-react";
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
  const [totalArticlesLoaded, setTotalArticlesLoaded] = useState<number>(0);

  // Automatically load news on component mount
  useEffect(() => {
    if (newsService) {
      loadNews();
    }
  }, [newsService]);

  const loadNews = async () => {
    if (!newsService) return;
    setIsLoading(true);
    setLoadingStatus("Lade aktuelle Woche KI-News...");
    
    try {
      console.log("=== STARTING CURRENT WEEK NEWS LOAD ===");
      
      toast.info("Lade KI-Nachrichten der aktuellen Woche...");
      
      setLoadingStatus("Sammle aktuelle News-Artikel...");
      const news = await newsService.fetchNews();
      setTotalArticlesLoaded(news.length);
      
      console.log(`Raw articles loaded: ${news.length}`);
      
      if (news.length === 0) {
        toast.warning("Keine aktuellen Artikel gefunden. Bitte aktivieren Sie mindestens eine RSS-Quelle.");
        setIsLoading(false);
        return;
      }
      
      setLoadingStatus("Filtere Artikel der aktuellen Woche...");
      
      // Group by week with strict filtering
      const weeklyDigests = newsService.groupNewsByWeek(news);
      setAllNews(weeklyDigests);
      
      // Set current week digest
      const currentWeekKey = Object.keys(weeklyDigests).sort().reverse()[0];
      if (currentWeekKey) {
        const currentDigest = weeklyDigests[currentWeekKey];
        setCurrentWeekDigest(currentDigest);
        setLoadingStatus("Aktuelle Woche geladen!");
        
        console.log(`Current week digest: ${currentDigest.items.length} articles`);
        console.log(`Total digests created: ${Object.keys(weeklyDigests).length}`);
        
        // Success message with current week focus
        const currentWeekArticles = currentDigest.items.length;
        toast.success(`${currentWeekArticles} Artikel der aktuellen Woche geladen`);
        
        if (currentWeekArticles < 5) {
          toast.info("Wenige Artikel in der aktuellen Woche gefunden. Dies ist normal für frühe Wochentage.");
        }
      } else {
        toast.warning("Keine Artikel für die aktuelle Woche gefunden.");
      }
      
    } catch (error) {
      console.error("Error loading current week news:", error);
      toast.error(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  const handleRssSourceChange = () => {
    setCurrentWeekDigest(null);
    setAllNews({});
    setTotalArticlesLoaded(0);
    if (newsService) {
      loadNews();
    }
  };

  const renderLoadingState = () => {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">
              {loadingStatus || "Lade KI-Nachrichten der aktuellen Woche..."}
            </p>
          </div>
          {totalArticlesLoaded > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <BarChart3 className="h-4 w-4" />
              <span>{totalArticlesLoaded} Artikel gefunden</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <NewsCardSkeleton key={i} />
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
                KI-News Aktuelle Woche
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-4 w-4" />
                Nur Artikel der aktuellen Woche
                {totalArticlesLoaded > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {currentWeekDigest?.items.length || 0} aktuelle Woche
                  </span>
                )}
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
                  Aktuelle Woche laden
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              renderLoadingState()
            ) : currentWeekDigest ? (
              <>
                {currentWeekDigest.items.length < 5 && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        Wenige Artikel der aktuellen Woche ({currentWeekDigest.items.length}). 
                        Normal für frühe Wochentage oder Wochenenden.
                      </span>
                    </div>
                  </div>
                )}
                
                {Object.keys(allNews).length > 1 && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">
                        Wochenübersicht: {Object.keys(allNews).length} Wochen verfügbar
                      </span>
                    </div>
                  </div>
                )}
                
                <WeeklyDigest 
                  digest={currentWeekDigest} 
                  apiKey={newsService?.getDefaultApiKey() || ""}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Rss className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground text-lg font-medium mb-2">
                  Keine Artikel der aktuellen Woche verfügbar
                </p>
                <p className="text-center text-muted-foreground mb-4">
                  Klicken Sie auf "Aktuelle Woche laden" für News der laufenden Woche
                </p>
                <p className="text-center text-sm text-muted-foreground mb-6">
                  Stellen Sie sicher, dass mindestens eine RSS-Quelle aktiviert ist
                </p>
                <Button 
                  onClick={loadNews}
                  className="gap-2"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4" />
                  Aktuelle Woche jetzt laden
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
