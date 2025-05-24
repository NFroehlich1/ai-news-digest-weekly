
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import NewsCard from "./NewsCard";
import { WeeklyDigest as WeeklyDigestType, RssItem } from "@/services/NewsService";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from 'react-markdown';
import NewsletterSubscribeModal from "./NewsletterSubscribeModal";
import ArticleSelector from "./ArticleSelector";
import { Calendar, FileEdit, Mail, Star, RefreshCw, TrendingUp, BarChart3 } from "lucide-react";
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
  
  const getArticleId = (article: RssItem): string => {
    return article.guid || article.link;
  };
  
  // Remove duplicate articles by ID
  const getUniqueArticles = (articles: RssItem[]): RssItem[] => {
    const uniqueMap = new Map<string, RssItem>();
    
    articles.forEach(article => {
      const id = getArticleId(article);
      if (!uniqueMap.has(id)) {
        uniqueMap.set(id, article);
      }
    });
    
    return Array.from(uniqueMap.values());
  };
  
  const handleGenerateSummary = async () => {
    if (generatedContent) {
      setGeneratedContent(null);
    }
    setIsGenerating(true);
    
    try {
      const newsService = new NewsService(apiKey); 
      const linkedInPage = "https://www.linkedin.com/company/linkit-karlsruhe/posts/?feedView=all";
      
      let articlesToUse = getUniqueArticles(digest.items);
      if (selectedArticles && selectedArticles.length > 0) {
        articlesToUse = getUniqueArticles(selectedArticles);
      } else if (prioritizedArticles.length > 0) {
        articlesToUse = getUniqueArticles(prioritizedArticles);
      }
      
      console.log(`Generating summary with ${articlesToUse.length} unique articles`);
      
      const summary = await newsService.generateNewsletterSummary(
        digest, 
        articlesToUse,
        linkedInPage
      );
      
      if (summary) {
        setGeneratedContent(summary);
        setActiveTab("summary");
        toast.success("Professionelle Zusammenfassung erfolgreich generiert!");
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
      const uniqueArticles = getUniqueArticles(digest.items);
      const topArticles = newsService.prioritizeNewsForNewsletter(uniqueArticles, 25); // Increased from 15 to 25
      
      setPrioritizedArticles(topArticles);
      setIsPrioritized(true);
      toast.success(`Die ${topArticles.length} wichtigsten Artikel wurden priorisiert`);
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
    const uniqueSelectedArticles = getUniqueArticles(articles);
    setSelectedArticles(uniqueSelectedArticles);
    setIsSelecting(false);
    
    if (uniqueSelectedArticles.length > 0) {
      toast.success(`${uniqueSelectedArticles.length} Artikel für die Zusammenfassung ausgewählt`);
    }
  };
  
  const cancelArticleSelection = () => {
    setIsSelecting(false);
  };
  
  const getDisplayArticles = () => {
    if (isPrioritized && prioritizedArticles.length > 0) {
      return prioritizedArticles;
    }
    if (selectedArticles && selectedArticles.length > 0) {
      return selectedArticles;
    }
    return getUniqueArticles(digest.items);
  };
  
  const totalArticles = getUniqueArticles(digest.items).length;
  const displayArticles = getDisplayArticles();
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Card className="mb-8 shadow-xl border-0 bg-gradient-to-br from-white to-gray-50/80 backdrop-blur-sm">
        <CardHeader className="border-b bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                    📬 LINKIT WEEKLY KW {digest.weekNumber}
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600 mt-1">
                    <span className="font-medium">{digest.dateRange}</span>
                    <span className="hidden sm:inline">•</span>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      <span className="font-semibold text-green-600">{totalArticles} Artikel geladen</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <NewsletterSubscribeModal newsletterContent={generatedContent || undefined} />
              
              {!isSelecting && !isGenerating && (
                <Button 
                  variant="outline" 
                  onClick={handlePrioritizeArticles}
                  className="gap-2 bg-white hover:bg-amber-50 border-amber-200 text-amber-700 hover:text-amber-800"
                  disabled={isPrioritized && prioritizedArticles.length > 0}
                >
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {isPrioritized ? `Top ${prioritizedArticles.length}` : "Top 25 Artikel"}
                  </span>
                  <span className="sm:hidden">Top</span>
                </Button>
              )}
              
              {!isGenerating && selectedArticles && selectedArticles.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={startArticleSelection} 
                  className="gap-2 bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">{selectedArticles.length} ausgewählt</span>
                  <span className="sm:hidden">{selectedArticles.length}</span>
                </Button>
              )}
              
              {!isSelecting ? (
                <>
                  {!selectedArticles && !isPrioritized && (
                    <Button 
                      variant="outline"
                      onClick={startArticleSelection} 
                      className="gap-2 bg-white hover:bg-green-50 border-green-200 text-green-700"
                    >
                      <FileEdit className="h-4 w-4" />
                      <span className="hidden sm:inline">Artikel auswählen</span>
                      <span className="sm:hidden">Auswählen</span>
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleGenerateSummary} 
                    disabled={isGenerating}
                    className="gap-2 bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isGenerating ? "Generiert..." : generatedContent ? "Neu generieren" : "Newsletter erstellen"}
                    </span>
                    <span className="sm:hidden">
                      {isGenerating ? "..." : generatedContent ? "Neu" : "Erstellen"}
                    </span>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          {isSelecting ? (
            <ArticleSelector 
              articles={getUniqueArticles(digest.items)} 
              onSubmit={completeArticleSelection}
              onCancel={cancelArticleSelection}
            />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
                <TabsTrigger 
                  value="news" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-primary"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Nachrichten</span>
                  <span className="sm:hidden">News</span>
                  <span className="ml-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-semibold">
                    {isPrioritized ? prioritizedArticles.length : selectedArticles ? selectedArticles.length : totalArticles}
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="summary" 
                  disabled={!generatedContent}
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-primary"
                >
                  <Mail className="h-4 w-4" />
                  Newsletter
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="news" className="mt-0">
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Artikel werden geladen...</p>
                  </div>
                ) : displayArticles.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {isPrioritized && (
                          <>
                            <Star className="h-4 w-4 text-amber-500" />
                            <span className="hidden sm:inline">Top {prioritizedArticles.length} priorisierte Artikel</span>
                            <span className="sm:hidden">Top {prioritizedArticles.length}</span>
                          </>
                        )}
                        {selectedArticles && (
                          <>
                            <FileEdit className="h-4 w-4 text-blue-500" />
                            <span className="hidden sm:inline">{selectedArticles.length} manuell ausgewählte Artikel</span>
                            <span className="sm:hidden">{selectedArticles.length} ausgewählt</span>
                          </>
                        )}
                        {!isPrioritized && !selectedArticles && (
                          <>
                            <BarChart3 className="h-4 w-4 text-green-500" />
                            <span className="hidden sm:inline font-semibold">Alle {totalArticles} verfügbaren Artikel</span>
                            <span className="sm:hidden">Alle {totalArticles}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                      {displayArticles.map((item, index) => (
                        <NewsCard 
                          key={`${getArticleId(item)}-${index}`}
                          item={item} 
                          apiKey={apiKey}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Keine Artikel gefunden</p>
                    <p className="text-sm text-gray-500 mt-2">Versuchen Sie, die Nachrichten neu zu laden</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="summary" className="mt-0">
                {generatedContent ? (
                  <div className="newsletter-content bg-white rounded-lg p-4 sm:p-8 shadow-sm border overflow-hidden">
                    <div className="prose prose-sm sm:prose-lg max-w-none prose-headings:text-primary prose-a:text-blue-600 prose-p:break-words prose-li:break-words">
                      <ReactMarkdown>
                        {generatedContent}
                      </ReactMarkdown>
                    </div>
                    
                    {!generatedContent.includes("linkedin.com/company/linkit-karlsruhe") && (
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="font-semibold text-gray-900 mb-2">Weitere Informationen und Updates:</p>
                        <p className="text-gray-700 break-words">
                          Besuchen Sie unsere{" "}
                          <a 
                            href="https://www.linkedin.com/company/linkit-karlsruhe/posts/?feedView=all" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary hover:text-primary/80 font-medium underline decoration-2 underline-offset-2 break-all"
                          >
                            LinkedIn-Seite
                          </a>{" "}
                          für aktuelle Beiträge und Neuigkeiten.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyDigest;
