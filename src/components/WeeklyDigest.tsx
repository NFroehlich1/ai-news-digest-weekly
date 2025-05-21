
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import NewsCard from "./NewsCard";
import { WeeklyDigest as WeeklyDigestType, RssItem } from "@/services/NewsService";
import DecoderService from "@/services/DecoderService";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from 'react-markdown';
import NewsletterSubscribeModal from "./NewsletterSubscribeModal";
import ArticleSelector from "./ArticleSelector";
import { Calendar, FileEdit, Mail, Star, RefreshCw } from "lucide-react";
import NewsService from "@/services/NewsService";

interface WeeklyDigestProps {
  digest: WeeklyDigestType;
  apiKey: string;
}

const WeeklyDigest = ({ digest, apiKey }: WeeklyDigestProps) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(digest.generatedContent || null);
  const [activeTab, setActiveTab] = useState<string>("news");
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectedArticles, setSelectedArticles] = useState<RssItem[] | null>(null);
  const [isPrioritized, setIsPrioritized] = useState<boolean>(false);
  const [prioritizedArticles, setPrioritizedArticles] = useState<RssItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const handleGenerateSummary = async () => {
    if (generatedContent) { // If content already exists, this is a "regenerate" action
      setGeneratedContent(null); // Clear old content to show loading state (skeletons)
    }
    setIsGenerating(true);
    
    try {
      const newsService = new NewsService(apiKey); // Corrected to use NewsService as per previous refactor
      const newsService = new NewsService(apiKey); // Corrected to use NewsService as per previous refactor
      
      // Add LinkedIn page to summary request
      const linkedInPage = "https://www.linkedin.com/company/linkit-karlsruhe/posts/?feedView=all";
      const summary = await newsService.generateNewsletterSummary( // Corrected to use newsService.generateNewsletterSummary
        digest, 
        selectedArticles || prioritizedArticles.length > 0 ? prioritizedArticles : undefined,
        linkedInPage
      );
      
      if (summary) {
        setGeneratedContent(summary);
        setActiveTab("summary");
        toast.success("Zusammenfassung erfolgreich generiert!");
      } else {
        toast.error("Fehler bei der Generierung der Zusammenfassung.");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error(`Fehler: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handlePrioritizeArticles = () => {
    try {
      const newsService = new NewsService(apiKey);
      const topArticles = newsService.prioritizeNewsForNewsletter(digest.items, 10);
      setPrioritizedArticles(topArticles);
      setIsPrioritized(true);
      toast.success(`Die 10 wichtigsten Artikel wurden priorisiert`);
      console.log("Prioritized articles:", topArticles);
    } catch (error) {
      console.error("Error prioritizing articles:", error);
      toast.error("Fehler bei der Priorisierung der Artikel");
    }
  };
  
  const startArticleSelection = () => {
    setIsSelecting(true);
  };
  
  const completeArticleSelection = (articles: RssItem[]) => {
    setSelectedArticles(articles);
    setIsSelecting(false);
    
    if (articles.length > 0) {
      toast.success(`${articles.length} Artikel für die Zusammenfassung ausgewählt`);
    }
  };
  
  const cancelArticleSelection = () => {
    setIsSelecting(false);
  };
  
  // Get the articles to display in the news tab
  const getDisplayArticles = () => {
    if (isPrioritized && prioritizedArticles.length > 0) {
      return prioritizedArticles;
    }
    if (selectedArticles && selectedArticles.length > 0) {
      return selectedArticles;
    }
    return digest.items;
  };
  
  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            KI-Update KW {digest.weekNumber}
          </CardTitle>
          <p className="text-muted-foreground">{digest.dateRange}</p>
          <p className="text-muted-foreground">({digest.items.length} Artikel)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <NewsletterSubscribeModal newsletterContent={generatedContent || undefined} />
          
          {!isSelecting && !isGenerating && (
            <Button 
              variant="outline" 
              onClick={handlePrioritizeArticles}
              className="gap-2"
              disabled={isPrioritized && prioritizedArticles.length > 0}
            >
              <Star className="h-4 w-4" />
              {isPrioritized ? `Top 10 (${prioritizedArticles.length})` : "Top 10 priorisieren"}
            </Button>
          )}
          
          {!isGenerating && selectedArticles && selectedArticles.length > 0 && (
            <Button variant="outline" onClick={startArticleSelection} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {selectedArticles.length} Artikel ausgewählt
            </Button>
          )}
          
          {!isSelecting ? (
            <>
              {!selectedArticles && !isPrioritized && (
                <Button 
                  variant="outline"
                  onClick={startArticleSelection} 
                  className="gap-2"
                >
                  <FileEdit className="h-4 w-4" />
                  Artikel auswählen
                </Button>
              )}
              
              <Button 
                onClick={handleGenerateSummary} 
                disabled={isGenerating}
                className="gap-2 shrink-0"
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {isGenerating ? "Wird generiert..." : generatedContent ? "Neu generieren" : "Zusammenfassen"}
              </Button>
            </>
          ) : null}
        </div>
      </CardHeader>
      
      <CardContent>
        {isSelecting ? (
          <ArticleSelector 
            articles={digest.items} 
            onSubmit={completeArticleSelection}
            onCancel={cancelArticleSelection}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="news">
                Nachrichten {isPrioritized ? `(Top ${prioritizedArticles.length})` : selectedArticles ? `(${selectedArticles.length} ausgewählt)` : `(${digest.items.length})`}
              </TabsTrigger>
              <TabsTrigger value="summary" disabled={!generatedContent}>Zusammenfassung</TabsTrigger>
            </TabsList>
            
            <TabsContent value="news">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  <p className="col-span-full text-center py-8">Artikel werden geladen...</p>
                ) : getDisplayArticles().length > 0 ? (
                  getDisplayArticles().map((item, index) => (
                    <NewsCard 
                      key={`${item.guid || item.link}-${index}`} 
                      item={item} 
                      apiKey={apiKey}
                    />
                  ))
                ) : (
                  <p className="col-span-full text-center py-8">Keine Artikel gefunden</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="summary">
              {generatedContent ? (
                <div className="newsletter-body bg-white rounded-md p-6 shadow-sm">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                  
                  {!generatedContent.includes("linkedin.com/company/linkit-karlsruhe") && (
                    <div className="mt-6 pt-4 border-t">
                      <p className="font-medium">Weitere Informationen und Updates:</p>
                      <p className="mt-2">
                        Besuchen Sie unsere <a href="https://www.linkedin.com/company/linkit-karlsruhe/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">LinkedIn-Seite</a> für aktuelle Beiträge und Neuigkeiten.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyDigest;
