import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Rss, RefreshCw, BarChart3, TrendingUp, AlertCircle, CheckCircle, Database } from "lucide-react";
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
  const [articleStats, setArticleStats] = useState<{
    total: number;
    thisWeek: number;
    processed: number;
    unprocessed: number;
  } | null>(null);

  // Automatically load news on component mount
  useEffect(() => {
    if (newsService) {
      loadNews();
      loadArticleStats();
    }
  }, [newsService]);

  const loadArticleStats = async () => {
    if (!newsService) return;
    
    try {
      const stats = await newsService.getArticleStats();
      setArticleStats(stats);
    } catch (error) {
      console.error("Error loading article stats:", error);
    }
  };

  const loadNews = async () => {
    if (!newsService) return;
    setIsLoading(true);
    setLoadingStatus("Lade KI-Nachrichten...");
    
    try {
      console.log("=== STARTING NEWS LOAD ===");
      
      toast.info("Lade KI-Nachrichten...");
      
      setLoadingStatus("Sammle aktuelle News-Artikel...");
      const news = await newsService.fetchNews();
      setTotalArticlesLoaded(news.length);
      
      console.log(`Raw articles loaded: ${news.length}`);
      
      if (news.length === 0) {
        toast.warning("Keine Artikel gefunden. Bitte aktivieren Sie mindestens eine RSS-Quelle.");
        setCurrentWeekDigest(null);
        setIsLoading(false);
        return;
      }
      
      setLoadingStatus("Erstelle Wochenübersicht...");
      
      // Group by week
      const weeklyDigests = newsService.groupNewsByWeek(news);
      setAllNews(weeklyDigests);
      
      // Set current week digest
      const currentWeekKey = Object.keys(weeklyDigests).sort().reverse()[0];
      if (currentWeekKey) {
        const currentDigest = weeklyDigests[currentWeekKey];
        setCurrentWeekDigest(currentDigest);
        setLoadingStatus("Erfolgreich geladen!");
        
        console.log(`Current week digest: ${currentDigest.items.length} articles`);
        console.log(`Total digests created: ${Object.keys(weeklyDigests).length}`);
        
        // Success message
        const currentWeekArticles = currentDigest.items.length;
        toast.success(`${currentWeekArticles} Artikel erfolgreich geladen`);
        
      } else {
        toast.warning("Keine Artikel gefunden.");
        setCurrentWeekDigest(null);
      }
      
      // Reload stats after fetching new articles
      await loadArticleStats();
      
    } catch (error) {
      console.error("Error loading news:", error);
      toast.error(`Fehler beim Laden der Nachrichten: ${(error as Error).message}`);
      setCurrentWeekDigest(null);
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
            <p className="text-base sm:text-lg font-medium text-muted-foreground">
              {loadingStatus || "Lade KI-Nachrichten..."}
            </p>
          </div>
          {totalArticlesLoaded > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>{totalArticlesLoaded} Artikel gefunden</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Mobile-first responsive layout */}
      <div className="block lg:hidden">
        {/* Mobile: Stack vertically */}
        <div className="space-y-6">
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

          {/* Article Stats Card - Mobile */}
          {articleStats && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4" />
                  Artikel-Statistiken
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-lg text-blue-600">{articleStats.total}</div>
                    <div className="text-muted-foreground">Gesamt</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg text-green-600">{articleStats.thisWeek}</div>
                    <div className="text-muted-foreground">Diese Woche</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg text-orange-600">{articleStats.processed}</div>
                    <div className="text-muted-foreground">Verarbeitet</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg text-purple-600">{articleStats.unprocessed}</div>
                    <div className="text-muted-foreground">Unverarbeitet</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Calendar className="h-5 w-5" />
                    KI-News Aktuell
                  </CardTitle>
                  <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Aktuelle KI-Nachrichten
                    </div>
                    {totalArticlesLoaded > 0 && (
                      <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {currentWeekDigest?.items.length || 0} Artikel
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button 
                  onClick={loadNews} 
                  disabled={isLoading}
                  className="gap-2 w-full sm:w-auto"
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Lädt...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Nachrichten laden
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {
                isLoading ? (
                renderLoadingState()
              ) : currentWeekDigest ? (
                <>
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
                    newsService={newsService || undefined}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                  <Rss className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                  <p className="text-center text-muted-foreground text-base sm:text-lg font-medium mb-2">
                    Keine Artikel verfügbar
                  </p>
                  <p className="text-center text-muted-foreground mb-4 text-sm sm:text-base max-w-md">
                    Klicken Sie auf "Nachrichten laden" um KI-News zu laden
                  </p>
                  <p className="text-center text-xs sm:text-sm text-muted-foreground mb-6 max-w-md">
                    Stellen Sie sicher, dass mindestens eine RSS-Quelle aktiviert ist
                  </p>
                  <Button 
                    onClick={loadNews}
                    className="gap-2 w-full sm:w-auto"
                    size="lg"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Nachrichten jetzt laden
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Desktop: Side-by-side layout */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-1 space-y-4">
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

          {/* Article Stats Card - Desktop */}
          {articleStats && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4" />
                  Artikel-Statistiken
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Gesamt:</span>
                    <span className="font-semibold text-blue-600">{articleStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diese Woche:</span>
                    <span className="font-semibold text-green-600">{articleStats.thisWeek}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verarbeitet:</span>
                    <span className="font-semibold text-orange-600">{articleStats.processed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unverarbeitet:</span>
                    <span className="font-semibold text-purple-600">{articleStats.unprocessed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  KI-News Aktuell
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <TrendingUp className="h-4 w-4" />
                  Aktuelle KI-Nachrichten
                  {totalArticlesLoaded > 0 && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {currentWeekDigest?.items.length || 0} Artikel
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
                    Nachrichten laden
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {
                isLoading ? (
                renderLoadingState()
              ) : currentWeekDigest ? (
                <>
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
                    newsService={newsService || undefined}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Rss className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-center text-muted-foreground text-lg font-medium mb-2">
                    Keine Artikel verfügbar
                  </p>
                  <p className="text-center text-muted-foreground mb-4">
                    Klicken Sie auf "Nachrichten laden" um KI-News zu laden
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
                    Nachrichten jetzt laden
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewsContentTab;
