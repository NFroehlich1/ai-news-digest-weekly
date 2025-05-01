
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
import { CalendarWeek, FileEdit, Mail } from "lucide-react";

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
  
  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    
    try {
      const decoderService = new DecoderService(apiKey);
      const summary = await decoderService.generateSummary(digest, selectedArticles || undefined);
      
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
  
  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarWeek className="h-6 w-6" />
            KI-Update KW {digest.weekNumber}
          </CardTitle>
          <p className="text-muted-foreground">{digest.dateRange}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <NewsletterSubscribeModal newsletterContent={generatedContent || undefined} />
          
          {!isGenerating && selectedArticles && selectedArticles.length > 0 && (
            <Button variant="outline" onClick={startArticleSelection}>
              {selectedArticles.length} Artikel ausgewählt
            </Button>
          )}
          
          {!isSelecting ? (
            <>
              {!selectedArticles && (
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
                <Mail className="h-4 w-4" />
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
              <TabsTrigger value="news">Nachrichten</TabsTrigger>
              <TabsTrigger value="summary" disabled={!generatedContent}>Zusammenfassung</TabsTrigger>
            </TabsList>
            
            <TabsContent value="news">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {digest.items.map((item, index) => (
                  <NewsCard key={index} item={item} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="summary">
              {generatedContent ? (
                <div className="newsletter-body bg-white rounded-md p-6 shadow-sm">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
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
