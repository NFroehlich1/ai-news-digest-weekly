import { useState, useEffect } from "react";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import { WeeklyDigest, RssItem, RssSource } from "@/types/newsTypes";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Rss, Plus, Calendar, Mail } from "lucide-react";
import DecoderService from "@/services/DecoderService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NewsService from "@/services/NewsService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from 'uuid';
import { formatDate, getCurrentWeek, getCurrentYear, getWeekDateRange } from "@/utils/dateUtils";
import ReactMarkdown from "react-markdown";

const Index = () => {
  const decoderService = new DecoderService();
  const defaultApiKey = decoderService.getDefaultApiKey();
  const newsService = new NewsService(defaultApiKey);
  
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("decoder_api_key") || defaultApiKey;
  });
  
  const [currentWeekDigest, setCurrentWeekDigest] = useState<WeeklyDigest | null>(null);
  const [newsletterContent, setNewsletterContent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [rssSources, setRssSources] = useState<RssSource[]>(newsService.getRssSources());
  const [activeTab, setActiveTab] = useState<string>("news");
  const [newArticleLink, setNewArticleLink] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isAddingArticle, setIsAddingArticle] = useState<boolean>(false);
  const [pendingArticles, setPendingArticles] = useState<string[]>([]);
  
  // Save API key to local storage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("decoder_api_key", apiKey);
      // Update the API key in the news service
      newsService.setApiKey(apiKey);
      decoderService.setApiKey(apiKey);
    }
  }, [apiKey]);
  
  // Load current week digest from local storage on initial load
  useEffect(() => {
    const savedDigests = localStorage.getItem("weekly_digests");
    if (savedDigests) {
      const digests = JSON.parse(savedDigests) as Record<string, WeeklyDigest>;
      
      // Get current week key
      const currentWeekData = getCurrentWeekData();
      const weekKey = `${currentWeekData.year}-W${currentWeekData.weekNumber}`;
      
      // If we have a digest for the current week, use it
      if (digests[weekKey]) {
        setCurrentWeekDigest(digests[weekKey]);
        // If there's generated content, load it
        if (digests[weekKey].generatedContent) {
          setNewsletterContent(digests[weekKey].generatedContent);
        }
      } else {
        // Create new digest for current week
        createNewWeeklyDigest();
      }
    } else {
      // No saved digests, create a new one
      createNewWeeklyDigest();
    }
  }, []);
  
  // Save current digest to local storage whenever it changes
  useEffect(() => {
    if (currentWeekDigest) {
      const savedDigests = localStorage.getItem("weekly_digests");
      const digests = savedDigests ? JSON.parse(savedDigests) : {};
      
      // Update the current digest
      digests[currentWeekDigest.id] = {
        ...currentWeekDigest,
        // Include newsletter content if available
        generatedContent: newsletterContent || currentWeekDigest.generatedContent
      };
      
      localStorage.setItem("weekly_digests", JSON.stringify(digests));
    }
  }, [currentWeekDigest, newsletterContent]);
  
  // Handle API key set
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
  
  // Create a new weekly digest
  const createNewWeeklyDigest = () => {
    const currentWeekData = getCurrentWeekData();
    const weekKey = `${currentWeekData.year}-W${currentWeekData.weekNumber}`;
    
    const newDigest: WeeklyDigest = {
      id: weekKey,
      weekNumber: currentWeekData.weekNumber,
      year: currentWeekData.year,
      dateRange: currentWeekData.dateRange,
      title: `KI-Update KW ${currentWeekData.weekNumber} · ${currentWeekData.dateRange}`,
      summary: `Die wichtigsten KI-Nachrichten der Woche ${currentWeekData.weekNumber}`,
      items: [],
      createdAt: new Date()
    };
    
    setCurrentWeekDigest(newDigest);
  };
  
  // Handle add article
  const handleAddArticle = async () => {
    if (!newArticleLink) {
      toast.error("Bitte gib einen Link zum Artikel ein");
      return;
    }
    
    try {
      setIsAddingArticle(true);
      toast.info("Artikel wird hinzugefügt...");
      
      const now = new Date();
      // Generate a unique ID for this article request
      const articleGuid = uuidv4();
      
      // Add this article link to pending articles to show loading state
      setPendingArticles(prev => [...prev, articleGuid]);
      
      // If there's no current digest, create one
      if (!currentWeekDigest) {
        createNewWeeklyDigest();
      }
      
      // Reset form and close dialog
      setNewArticleLink("");
      setDialogOpen(false);
      
      // Try to fetch metadata about the article and generate AI summary
      try {
        console.log("Fetching metadata for:", newArticleLink);
        const metadata = await decoderService.extractArticleMetadata(newArticleLink);
        
        console.log("Received metadata:", metadata);
        
        if (metadata) {
          // Create complete article with metadata and AI summary
          const completeArticle: RssItem = {
            guid: articleGuid,
            title: metadata.title || "Artikel ohne Titel",
            description: metadata.description || "Keine Beschreibung verfügbar",
            link: newArticleLink,
            content: "",
            pubDate: now.toISOString(),
            categories: metadata.categories || ["KI"],
            sourceName: metadata.sourceName || new URL(newArticleLink).hostname.replace('www.', ''),
            imageUrl: metadata.imageUrl,
            aiSummary: metadata.aiSummary || ""
          };
          
          // Generate AI summary if not already provided
          if (!completeArticle.aiSummary) {
            console.log("Generating AI summary for article");
            const aiSummary = await decoderService.generateArticleSummary(completeArticle);
            
            if (aiSummary) {
              console.log("AI summary generated:", aiSummary);
              completeArticle.aiSummary = aiSummary;
            }
          }
          
          // Only add the article when fully processed
          if (currentWeekDigest) {
            setCurrentWeekDigest(prevDigest => {
              if (!prevDigest) return null;
              return {
                ...prevDigest,
                items: [completeArticle, ...prevDigest.items]
              };
            });
            
            toast.success("Artikel erfolgreich hinzugefügt");
          }
        }
      } catch (error) {
        console.error("Error fetching article metadata:", error);
        toast.error("Fehler beim Abrufen der Artikelinformationen");
        
        // Add a basic article so the user doesn't lose their input
        if (currentWeekDigest) {
          const fallbackArticle: RssItem = {
            guid: articleGuid,
            title: new URL(newArticleLink).hostname,
            description: "Keine Beschreibung verfügbar",
            link: newArticleLink,
            content: "",
            pubDate: now.toISOString(),
            categories: ["KI"],
            sourceName: new URL(newArticleLink).hostname.replace('www.', '')
          };
          
          setCurrentWeekDigest(prevDigest => {
            if (!prevDigest) return null;
            return {
              ...prevDigest,
              items: [fallbackArticle, ...prevDigest.items]
            };
          });
        }
      } finally {
        // Remove this article from pending articles
        setPendingArticles(prev => prev.filter(id => id !== articleGuid));
      }
    } catch (error) {
      console.error("Error adding article:", error);
      toast.error(`Fehler beim Hinzufügen des Artikels: ${(error as Error).message}`);
    } finally {
      setIsAddingArticle(false);
    }
  };
  
  // Generate newsletter content
  const handleGenerateNewsletter = async () => {
    if (!currentWeekDigest || currentWeekDigest.items.length === 0) {
      toast.error("Keine Artikel vorhanden, füge zuerst Artikel hinzu");
      return;
    }
    
    setIsGenerating(true);
    toast.info("Newsletter wird generiert...");
    
    try {
      const generatedContent = await decoderService.generateSummary(currentWeekDigest);
      
      if (generatedContent) {
        setNewsletterContent(generatedContent);
        setActiveTab("newsletter");
        toast.success("Newsletter erfolgreich generiert");
      } else {
        toast.error("Fehler bei der Newsletter-Generierung");
      }
    } catch (error) {
      console.error("Error generating newsletter:", error);
      toast.error(`Fehler bei der Generierung: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle manual refresh - clean up old articles
  const handleRefresh = () => {
    if (currentWeekDigest) {
      // Remove items older than a week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const updatedItems = currentWeekDigest.items.filter(item => {
        const pubDate = new Date(item.pubDate);
        return pubDate >= oneWeekAgo;
      });
      
      setCurrentWeekDigest({
        ...currentWeekDigest,
        items: updatedItems
      });
      
      toast.success("Artikel aktualisiert - alte Artikel entfernt");
    }
  };
  
  // Copy newsletter content to clipboard
  const copyNewsletterToClipboard = () => {
    if (newsletterContent) {
      navigator.clipboard.writeText(newsletterContent)
        .then(() => toast.success("Newsletter in die Zwischenablage kopiert"))
        .catch(() => toast.error("Fehler beim Kopieren in die Zwischenablage"));
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header 
        onApiKeySet={handleApiKeySet} 
        onRefresh={handleRefresh} 
        loading={isGenerating || isAddingArticle}
        defaultApiKey={defaultApiKey}
      />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="news">Artikel</TabsTrigger>
                  <TabsTrigger value="newsletter" disabled={!newsletterContent}>LINKIT Newsletter</TabsTrigger>
                </TabsList>
                
                <div className="flex gap-2">
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
                          Füge einen Link zum Artikel hinzu. Titel, KI-Zusammenfassung und weitere Informationen werden automatisch abgeleitet.
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
                  
                  <Button 
                    onClick={handleGenerateNewsletter} 
                    disabled={isGenerating || !currentWeekDigest || currentWeekDigest.items.length === 0}
                    variant="secondary"
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {isGenerating ? "Wird generiert..." : newsletterContent ? "Newsletter aktualisieren" : "Newsletter generieren"}
                  </Button>
                </div>
              </div>
              
              <TabsContent value="news">
                <div className="mb-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {currentWeekDigest?.title || "KI-News dieser Woche"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(!currentWeekDigest || currentWeekDigest.items.length === 0) && pendingArticles.length === 0 ? (
                        <div className="text-center py-12">
                          <h2 className="text-xl font-bold mb-2">Keine Artikel vorhanden</h2>
                          <p className="text-muted-foreground mb-4">
                            Füge Artikel hinzu, um mit der Erstellung von Zusammenfassungen zu beginnen.
                          </p>
                          <Button onClick={() => setDialogOpen(true)} className="inline-flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Ersten Artikel hinzufügen
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Display pending articles with loading state */}
                          {pendingArticles.map((guid) => (
                            <NewsCard 
                              key={guid} 
                              item={{
                                guid,
                                title: "Artikel wird geladen...",
                                description: "Informationen werden abgerufen...",
                                link: "",
                                content: "",
                                pubDate: new Date().toISOString(),
                                isLoading: true
                              }} 
                              isLoading={true}
                            />
                          ))}
                          
                          {/* Display existing articles */}
                          {currentWeekDigest?.items.map((article, index) => (
                            <NewsCard key={article.guid || index} item={article} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="mt-4">
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
              
              <TabsContent value="newsletter">
                {newsletterContent ? (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        LINKIT Newsletter
                      </CardTitle>
                      <Button 
                        onClick={copyNewsletterToClipboard}
                        variant="outline"
                      >
                        In Zwischenablage kopieren
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="newsletter-body bg-white rounded-md p-6 shadow-sm">
                        <ReactMarkdown>{newsletterContent}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12">
                    <h2 className="text-xl font-bold mb-2">Kein Newsletter generiert</h2>
                    <p className="text-muted-foreground mb-4">
                      Klicke auf "Newsletter generieren", um einen Newsletter zu erstellen.
                    </p>
                    <Button 
                      onClick={handleGenerateNewsletter}
                      disabled={!currentWeekDigest || currentWeekDigest.items.length === 0 || isGenerating}
                    >
                      {isGenerating ? "Wird generiert..." : "Newsletter generieren"}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
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
