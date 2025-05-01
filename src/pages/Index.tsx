import { useState, useEffect } from "react";
import Header from "@/components/Header";
import WeeklyDigest from "@/components/WeeklyDigest";
import RssSourceManager from "@/components/RssSourceManager";
import { WeeklyDigest as WeeklyDigestType, RssItem, RssSource } from "@/services/NewsService";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Rss, Plus } from "lucide-react";
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
    }
  }, [apiKey]);
  
  // Save digests to local storage
  useEffect(() => {
    localStorage.setItem("weekly_digests", JSON.stringify(weeklyDigests));
  }, [weeklyDigests]);
  
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
      dateRange: getWeekDateRange(currentWeek, currentYear)
    };
  };
  
  // Add a new manual article
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
      const weekKey = `week-${currentWeekData.weekNumber}-${new Date().getFullYear()}`;
      
      let currentDigest = weeklyDigests[weekKey];
      if (!currentDigest) {
        currentDigest = {
          id: weekKey,
          weekNumber: currentWeekData.weekNumber,
          year: new Date().getFullYear(),
          dateRange: currentWeekData.dateRange,
          items: [],
          title: `KI-Update KW ${currentWeekData.weekNumber} · ${currentWeekData.dateRange}`,
          summary: `Die wichtigsten KI-Nachrichten der Woche ${currentWeekData.weekNumber}`,
          generatedContent: null,
          createdAt: now
        };
      }
      
      // Add article to digest
      currentDigest.items = [article, ...currentDigest.items];
      
      // Update digests
      setWeeklyDigests({...weeklyDigests, [weekKey]: currentDigest});
      
      // Reset form
      setNewArticleLink("");
      setDialogOpen(false);
      
      toast.success("Artikel erfolgreich hinzugefügt");
      
      // Try to fetch more info about the article using the decoder service
      try {
        // This would be where you'd call an AI service to get article metadata from the URL
        // For now we'll just leave the placeholder data
        toast.info("Artikel-Informationen werden abgerufen...");
      } catch (error) {
        console.error("Error fetching article metadata:", error);
      }
    } catch (error) {
      console.error("Error adding article:", error);
      toast.error(`Fehler beim Hinzufügen des Artikels: ${(error as Error).message}`);
    } finally {
      setIsAddingArticle(false);
    }
  };
  
  // Render weekly digests
  const renderWeeklyDigests = () => {
    const sortedKeys = Object.keys(weeklyDigests).sort().reverse();
    
    if (sortedKeys.length === 0) {
      return (
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
      );
    }
    
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
        onRefresh={() => {}} 
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
                      Fügen Sie einen Link zum Artikel hinzu. Titel und weitere Informationen werden automatisch abgeleitet.
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
              {renderWeeklyDigests()}
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
