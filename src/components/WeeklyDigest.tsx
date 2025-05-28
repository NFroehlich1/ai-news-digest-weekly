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
import { Calendar, FileEdit, Mail, RefreshCw, TrendingUp, Archive, CheckCircle, AlertTriangle, Save, Zap } from "lucide-react";
import NewsService from "@/services/NewsService";
import NewsletterArchiveService from "@/services/NewsletterArchiveService";

interface WeeklyDigestProps {
  digest: WeeklyDigestType;
  apiKey: string;
  newsService?: NewsService;
}

const WeeklyDigest = ({ digest, apiKey, newsService }: WeeklyDigestProps) => {
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(digest.generatedContent || null);
  const [activeTab, setActiveTab] = useState<string>("news");
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectedArticles, setSelectedArticles] = useState<RssItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedToArchive, setSavedToArchive] = useState<boolean>(false);
  const [archiveSaveError, setArchiveSaveError] = useState<string | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState<boolean>(false);
  
  const getArticleId = (article: RssItem): string => {
    return article.guid || article.link;
  };
  
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
  
  const saveToArchive = async (content: string): Promise<boolean> => {
    console.log("=== STARTING NEWSLETTER ARCHIVE SAVE ===");
    setIsSaving(true);
    setArchiveSaveError(null);
    
    try {
      console.log("Validating content and digest...");
      if (!content || content.trim().length === 0) {
        const error = "Newsletter-Inhalt ist leer";
        console.error(error);
        setArchiveSaveError(error);
        toast.error(error);
        return false;
      }
      
      if (!digest || !digest.weekNumber || !digest.year) {
        const error = "Digest-Informationen sind unvollständig";
        console.error(error);
        setArchiveSaveError(error);
        toast.error(error);
        return false;
      }
      
      console.log(`Saving newsletter for week ${digest.weekNumber}/${digest.year}...`);
      
      const archiveService = new NewsletterArchiveService();
      const result = await archiveService.saveNewsletter(digest, content);
      
      if (result && result.id) {
        console.log("✅ Newsletter successfully saved to archive:", result.id);
        setSavedToArchive(true);
        setArchiveSaveError(null);
        toast.success(`Newsletter erfolgreich im Archiv gespeichert! (ID: ${result.id})`);
        return true;
      } else {
        const error = "Speichern fehlgeschlagen - kein Ergebnis erhalten";
        console.error(error);
        setArchiveSaveError(error);
        toast.error(error);
        return false;
      }
    } catch (error) {
      console.error("❌ Error saving to archive:", error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      setArchiveSaveError(errorMessage);
      toast.error(`Archiv-Fehler: ${errorMessage}`);
      return false;
    } finally {
      setIsSaving(false);
      console.log("=== NEWSLETTER ARCHIVE SAVE COMPLETED ===");
    }
  };
  
  const handleGenerateSummary = async () => {
    console.log("=== STARTING NEWSLETTER GENERATION ===");
    
    if (generatedContent) {
      setGeneratedContent(null);
      setSavedToArchive(false);
      setArchiveSaveError(null);
    }
    
    setIsGenerating(true);
    
    try {
      const serviceToUse = newsService || new NewsService();
      const linkedInPage = "https://www.linkedin.com/company/linkit-karlsruhe/posts/?feedView=all";
      
      let articlesToUse = getUniqueArticles(digest.items);
      if (selectedArticles && selectedArticles.length > 0) {
        articlesToUse = getUniqueArticles(selectedArticles);
      }
      
      console.log(`Generating newsletter with ${articlesToUse.length} articles`);
      
      const summary = await serviceToUse.generateNewsletterSummary(
        digest, 
        articlesToUse,
        linkedInPage
      );
      
      if (summary && summary.trim().length > 0) {
        console.log("✅ Newsletter generated successfully");
        setGeneratedContent(summary);
        setActiveTab("summary");
        toast.success("Newsletter erfolgreich generiert!");
      } else {
        throw new Error("Newsletter-Generierung hat leeren Inhalt zurückgegeben");
      }
    } catch (error) {
      console.error("❌ Error generating newsletter:", error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(`Generierungs-Fehler: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToArchive = async () => {
    if (!generatedContent) {
      toast.error("Kein Newsletter-Inhalt zum Speichern vorhanden");
      return;
    }
    
    console.log("=== MANUAL SAVE TRIGGERED ===");
    const success = await saveToArchive(generatedContent);
    
    if (success) {
      console.log("Newsletter successfully saved to archive");
    }
  };

  const handleAutomaticGeneration = async () => {
    if (!newsService) {
      toast.error("NewsService nicht verfügbar");
      return;
    }

    setIsAutoGenerating(true);
    
    try {
      console.log("=== TRIGGERING AUTOMATIC NEWSLETTER GENERATION ===");
      const result = await newsService.triggerAutomaticGeneration();
      
      if (result.success) {
        if (result.data?.existing) {
          toast.info("Newsletter für diese Woche bereits vorhanden");
        } else {
          toast.success("Newsletter automatisch generiert und gespeichert!");
        }
      }
    } catch (error) {
      console.error("Error in automatic generation:", error);
      toast.error("Fehler bei der automatischen Generierung");
    } finally {
      setIsAutoGenerating(false);
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
    if (selectedArticles && selectedArticles.length > 0) {
      return selectedArticles;
    }
    return getUniqueArticles(digest.items);
  };
  
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
                    {isSaving && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Archive className="h-3 w-3 animate-pulse" />
                        <span className="text-xs">Speichere im Archiv...</span>
                      </div>
                    )}
                    {savedToArchive && !isSaving && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span className="text-xs">Im Archiv gespeichert</span>
                      </div>
                    )}
                    {archiveSaveError && !isSaving && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs">Archiv-Fehler</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <NewsletterSubscribeModal newsletterContent={generatedContent || undefined} />
              
              {selectedArticles && selectedArticles.length > 0 && (
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
                  {!selectedArticles && (
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
                    onClick={handleAutomaticGeneration} 
                    disabled={isAutoGenerating}
                    variant="outline"
                    className="gap-2 bg-white hover:bg-purple-50 border-purple-200 text-purple-700"
                  >
                    {isAutoGenerating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isAutoGenerating ? "Generiert automatisch..." : "Auto-Newsletter"}
                    </span>
                    <span className="sm:hidden">
                      {isAutoGenerating ? "..." : "Auto"}
                    </span>
                  </Button>
                  
                  <Button 
                    onClick={handleGenerateSummary} 
                    disabled={isGenerating || isSaving}
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

                  {generatedContent && (
                    <Button 
                      onClick={handleSaveToArchive} 
                      disabled={isSaving || savedToArchive}
                      variant="outline"
                      className="gap-2 bg-white hover:bg-green-50 border-green-200 text-green-700"
                    >
                      {isSaving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : savedToArchive ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {isSaving ? "Speichert..." : savedToArchive ? "Gespeichert" : "Im Archiv speichern"}
                      </span>
                      <span className="sm:hidden">
                        {isSaving ? "..." : savedToArchive ? "✓" : "Speichern"}
                      </span>
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          </div>
          
          {archiveSaveError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">Archiv-Speicher-Fehler:</p>
                  <p className="mt-1">{archiveSaveError}</p>
                </div>
              </div>
            </div>
          )}
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
                    {selectedArticles && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 pb-4 border-b">
                        <FileEdit className="h-4 w-4 text-blue-500" />
                        <span className="hidden sm:inline">{selectedArticles.length} ausgewählte Artikel</span>
                        <span className="sm:hidden">{selectedArticles.length} ausgewählt</span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                      {displayArticles.map((item, index) => (
                        <NewsCard 
                          key={`${getArticleId(item)}-${index}`}
                          item={item}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Keine Artikel gefunden</p>
                    <p className="text-sm text-gray-500 mt-2">Versuchen Sie, die Nachrichten neu zu laden</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="summary" className="mt-0">
                {generatedContent ? (
                  <div className="newsletter-content bg-white rounded-lg border shadow-sm">
                    <div className="p-6 sm:p-8">
                      <div className="prose prose-sm sm:prose-lg max-w-none prose-headings:text-primary prose-a:text-blue-600 prose-p:leading-relaxed prose-li:leading-relaxed">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-6 border-b border-gray-200 pb-3">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mt-8 mb-4">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mt-6 mb-3">{children}</h3>,
                            p: ({ children }) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700">{children}</ul>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            a: ({ href, children }) => (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 font-medium break-words"
                              >
                                {children}
                              </a>
                            ),
                            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            em: ({ children }) => <em className="italic text-gray-800">{children}</em>
                          }}
                        >
                          {generatedContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                    
                    {!generatedContent.includes("linkedin.com/company/linkit-karlsruhe") && (
                      <div className="px-6 sm:px-8 pb-6 border-t border-gray-200 bg-gray-50">
                        <div className="pt-6">
                          <p className="font-semibold text-gray-900 mb-2">Weitere Informationen und Updates:</p>
                          <p className="text-gray-700 leading-relaxed">
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
