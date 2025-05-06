
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Rss } from "lucide-react";
import { toast } from "sonner";
import WeeklyDigest from "@/components/WeeklyDigest";
import RssSourceManager from "@/components/RssSourceManager";
import NewsService, { WeeklyDigest as WeeklyDigestType } from "@/services/NewsService";

interface NewsContentTabProps {
  newsService: NewsService | null;
}

const NewsContentTab = ({ newsService }: NewsContentTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeekDigest, setCurrentWeekDigest] = useState<WeeklyDigestType | null>(null);
  const [allNews, setAllNews] = useState<Record<string, WeeklyDigestType>>({});

  const loadNews = async () => {
    if (!newsService) return;
    setIsLoading(true);
    
    try {
      // Fetch only from enabled sources
      const news = await newsService.fetchNews();
      
      if (news.length === 0) {
        toast.warning("Keine Artikel gefunden. Bitte aktivieren Sie mindestens eine RSS-Quelle.");
        setIsLoading(false);
        return;
      }
      
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

  const handleRssSourceChange = () => {
    // Reload news after RSS source changes
    if (newsService) {
      loadNews();
    }
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
                <p className="text-center text-muted-foreground mt-2">
                  Stellen Sie sicher, dass mindestens eine RSS-Quelle aktiviert ist.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewsContentTab;
