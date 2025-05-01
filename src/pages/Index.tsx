
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import type { WeeklyDigest as WeeklyDigestType, RssItem, RssSource } from "@/types/newsTypes";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Rss, Plus, Grid3x3 } from "lucide-react";
import DecoderService from "@/services/DecoderService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NewsService from "@/services/NewsService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from 'uuid';
import { formatDate, getCurrentWeek, getWeekDateRange } from "@/utils/dateUtils";

const Index = () => {
  const decoderService = new DecoderService();
  const defaultApiKey = decoderService.getDefaultApiKey();
  const newsService = new NewsService();
  
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("decoder_api_key") || defaultApiKey;
  });
  
  const [allArticles, setAllArticles] = useState<RssItem[]>([]);
  const [weeklyDigests, setWeeklyDigests] = useState<Record<string, WeeklyDigestType>>(() => {
    const savedDigests = localStorage.getItem("weekly_digests");
    return savedDigests ? JSON.parse(savedDigests) : {};
  });
  
  const [rssSources, setRssSources] = useState<RssSource[]>(newsService.getRssSources());
  const [activeTab, setActiveTab] = useState<string>("news");
  const [newArticleLink, setNewArticleLink] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isAddingArticle, setIsAddingArticle] = useState<boolean>(false);
  
  // Save API key to local storage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("decoder_api_key", apiKey);
      // Update the API key in the news service
      newsService.setApiKey(apiKey);
    }
  }, [apiKey]);
  
  // Save digests to local storage
  useEffect(() => {
    localStorage.setItem("weekly_digests", JSON.stringify(weeklyDigests));
    
    // Extract all articles from weekly digests
    const articles: RssItem[] = [];
    Object.values(weeklyDigests).forEach(digest => {
      articles.push(...digest.items);
    });
    
    // Sort by date (newest first)
    articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    setAllArticles(articles);
  }, [weeklyDigests]);
  
  // Cleanup old articles once a day
  useEffect(() => {
    // Run cleanup once on initial load
    const cleanedDigests = newsService.cleanupOldArticles(weeklyDigests);
    if (Object.keys(cleanedDigests).length !== Object.keys(weeklyDigests).length) {
      setWeeklyDigests(cleanedDigests);
    }
    
    // Set up a daily interval to clean up old articles
    const cleanupInterval = setInterval(() => {
      const cleanedDigests = newsService.cleanupOldArticles(weeklyDigests);
      setWeeklyDigests(cleanedDigests);
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  // Initial API key setup
  const handleApiKeySet = (newApiKey: string) => {
    setApiKey(newApiKey);
  };
  
  // Get current week data for organizing articles
  const getCurrentWeekData = () => {
    const now = new Date();
    const currentWeek = getCurrentWeek();
    const currentYear = now.getFullYear();
    
    return {
      weekNumber: currentWeek,
      year: currentYear,
      dateRange: getWeekDateRange(currentWeek, currentYear)
    };
  };
  
  // Add a new article
  const handleAddArticle = async () => {
    if (!newArticleLink) {
      toast.error("Bitte gib einen Link zum Artikel ein");
      return;
    }
    
    try {
      setIsAddingArticle(true);
      
      // Create new article with minimal info
      const now = new Date();
      const guid = uuidv4();
      
      // Basic article with just the link
      const article: RssItem = {
        title: "Wird geladen...",
        link: newArticleLink,
        description: "Artikel-Informationen werden abgerufen...",
        pubDate: now.toISOString(),
        content: "",
        guid: guid,
        categories: [],
        sourceName: "Manueller Eintrag"
      };
      
      // Get or create current week digest
      const currentWeekData = getCurrentWeekData();
      const weekKey = `${currentWeekData.year}-W${currentWeekData.weekNumber}`;
      
      // Check if digest exists or create a new one
      const updatedDigests = { ...weeklyDigests };
      if (!updatedDigests[weekKey]) {
        updatedDigests[weekKey] = {
          id: weekKey,
          weekNumber: currentWeekData.weekNumber,
          year: currentWeekData.year,
          dateRange: currentWeekData.dateRange,
          items: [],
          title: `KI-Update KW ${currentWeekData.weekNumber} · ${currentWeekData.dateRange}`,
          summary: `Die wichtigsten KI-Nachrichten der Woche ${currentWeekData.weekNumber}`,
          createdAt: now
        };
      }
      
      // Add article to digest
      updatedDigests[weekKey].items = [article, ...updatedDigests[weekKey].items];
      
      // Update digests
      setWeeklyDigests(updatedDigests);
      
      // Reset form
      setNewArticleLink("");
      setDialogOpen(false);
      
      toast.success("Artikel erfolgreich hinzugefügt");
      
      // Try to fetch metadata about the article
      try {
        const metadata = await newsService.fetchArticleMetadata(newArticleLink);
        
        if (metadata) {
          // Find the article and update its metadata
          const newUpdatedDigests = { ...updatedDigests };
          const articleToUpdate = newUpdatedDigests[weekKey].items.find(item => item.guid === guid);
          
          if (articleToUpdate) {
            Object.assign(articleToUpdate, {
              ...metadata,
              guid: guid, // Keep the original GUID
              pubDate: now.toISOString(), // Keep the original publication date
              link: newArticleLink // Keep the original link
            });
            
            // If no AI summary was provided in metadata, generate one specifically
            if (!articleToUpdate.aiSummary) {
              const aiSummary = await decoderService.generateArticleSummary(articleToUpdate);
              if (aiSummary) {
                articleToUpdate.aiSummary = aiSummary;
              }
            }
            
            setWeeklyDigests(newUpdatedDigests);
            toast.success("Artikelinformationen aktualisiert");
          }
        }
      } catch (error) {
        console.error("Error fetching article metadata:", error);
        toast.error("Fehler beim Abrufen der Artikelinformationen");
      }
    } catch (error) {
      console.error("Error adding article:", error);
      toast.error(`Fehler beim Hinzufügen des Artikels: ${(error as Error).message}`);
    } finally {
      setIsAddingArticle(false);
    }
  };
  
  // Handle manual refresh - clean up old articles
  const handleRefresh = () => {
    const cleanedDigests = newsService.cleanupOldArticles(weeklyDigests);
    setWeeklyDigests(cleanedDigests);
    toast.success("Artikel aktualisiert - alte Artikel entfernt");
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header 
        onApiKeySet={handleApiKeySet} 
        onRefresh={handleRefresh} 
        loading={false}
        defaultApiKey={defaultApiKey}
      />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="news">Nachrichten</TabsTrigger>
                <TabsTrigger value="sources">RSS-Quellen</TabsTrigger>
              </TabsList>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Artikel hinzufügen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Neuen Artikel hinzufügen</DialogTitle>
                    <DialogDescription>
                      Fügen Sie einen Link zum Artikel hinzu. Titel, KI-Zusammenfassung und weitere Informationen werden automatisch abgeleitet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="link">Artikel-Link*</Label>
                      <Input
                        id="link"
                        placeholder="https://beispiel.de/artikel"
                        value={newArticleLink}
                        onChange={(e) => setNewArticleLink(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleAddArticle} 
                      disabled={isAddingArticle || !newArticleLink}
                    >
                      {isAddingArticle ? "Wird hinzugefügt..." : "Hinzufügen"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <TabsContent value="news">
              {allArticles.length === 0 ? (
                <div className="text-center py-12">
                  <h2 className="text-xl font-bold mb-2">Keine Artikel vorhanden</h2>
                  <p className="text-muted-foreground mb-4">
                    Fügen Sie Artikel hinzu, um mit der Erstellung von Zusammenfassungen zu beginnen.
                  </p>
                  <Button onClick={() => setDialogOpen(true)} className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Ersten Artikel hinzufügen
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Grid3x3 className="h-5 w-5" />
                      Artikelsammlung
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allArticles.map((article, index) => (
                      <NewsCard key={`${article.guid || index}`} item={article} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="sources">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rss className="h-5 w-5" />
                    RSS-Quellen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertTitle>Manuelle Artikel-Verwaltung aktiv</AlertTitle>
                    <AlertDescription>
                      Die automatische Artikel-Sammlung über RSS-Feeds wurde deaktiviert. 
                      Sie können Artikel manuell über den "Artikel hinzufügen" Button einfügen.
                      Jeder Artikel erhält automatisch eine KI-Zusammenfassung, die im Newsletter verwendet wird.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
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
