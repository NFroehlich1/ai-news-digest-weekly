import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RssItem } from "@/types/newsTypes";
import { ExternalLink, Trash2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/dateUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import NewsService from "@/services/NewsService";

interface NewsCardProps {
  item: RssItem;
  isLoading?: boolean;
  onDelete?: (item: RssItem) => void;
  apiKey?: string;
}

const NewsCard = ({ item, isLoading = false, onDelete, apiKey }: NewsCardProps) => {
  const { title, link, pubDate, description, categories, sourceName, aiSummary, content } = item;
  const [isOpen, setIsOpen] = useState(false);
  const [localAiSummary, setLocalAiSummary] = useState<string | null>(aiSummary || null);
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false);
  
  // Only use imageUrl if it passes basic validation
  const validateImageUrl = (url?: string): boolean => {
    if (!url) return false;
    // Check for common image extensions
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
  };
  
  const imageUrl = validateImageUrl(item.imageUrl) ? item.imageUrl : null;

  // Show loading skeleton when article is being generated
  if (isLoading) {
    return (
      <Card className="overflow-hidden h-full flex flex-col">
        {Math.random() > 0.5 && (
          <div className="h-48 overflow-hidden">
            <Skeleton className="h-full w-full" />
          </div>
        )}
        <CardHeader>
          <Skeleton className="h-6 w-full mb-2" />
          <div className="flex items-center justify-between mt-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-1/4" />
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-2">
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(item);
    }
  };

  // Get preview text - prioritize AI summary, fallback to description
  const getPreviewText = () => {
    if (localAiSummary) {
      return localAiSummary.length > 200
        ? `${localAiSummary.substring(0, 200)}...`
        : localAiSummary;
    } else if (description) {
      return description.length > 150
        ? `${description.substring(0, 150)}...`
        : description;
    }
    return null;
  };
  
  // Generate AI summary on-demand
  const generateAiSummary = async () => {
    if (isGeneratingAiSummary) return;
    
    setIsGeneratingAiSummary(true);
    try {
      const newsService = new NewsService(); // Updated to use no arguments
      const summary = await newsService.generateArticleSummary(item);
      if (summary) {
        setLocalAiSummary(summary);
        toast.success("KI-Zusammenfassung generiert");
      } else {
        toast.error("Fehler bei der Generierung der Zusammenfassung");
      }
    } catch (error) {
      console.error("Error generating AI summary:", error);
      toast.error("Fehler bei der Generierung der Zusammenfassung");
    } finally {
      setIsGeneratingAiSummary(false);
    }
  };

  // When expanding the article and no AI summary exists, generate one
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !localAiSummary) {
      generateAiSummary();
    }
  };

  return (
    <Card className="overflow-hidden h-full flex flex-col relative">
      {imageUrl && (
        <div className="h-48 overflow-hidden">
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide the image container if loading fails
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.style.display = 'none';
            }}
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-lg line-clamp-3">{title}</CardTitle>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-muted-foreground">{formatDate(pubDate)}</span>
          {sourceName && (
            <div>
              <Badge variant="outline">{sourceName}</Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="flex-grow">
        <CardContent className="pb-0">
          {!isOpen && localAiSummary && (
            <div>
              <h4 className="text-sm font-medium mb-2">KI-Zusammenfassung</h4>
              <p className="text-sm line-clamp-3">{getPreviewText()}</p>
            </div>
          )}
          
          <CollapsibleTrigger asChild className="w-full">
            <Button variant="ghost" size="sm" className="w-full flex items-center justify-center text-xs mt-2">
              {isOpen ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Weniger anzeigen
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Mehr anzeigen
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            {isGeneratingAiSummary ? (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-medium mb-2">KI-Zusammenfassung wird generiert...</h4>
                <div className="bg-muted/30 p-3 rounded flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <p className="text-sm">Bitte warten...</p>
                </div>
              </div>
            ) : localAiSummary ? (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-medium mb-2 flex justify-between">
                  <span>KI-Zusammenfassung</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs" 
                    onClick={(e) => {
                      e.preventDefault();
                      generateAiSummary();
                    }}
                    disabled={isGeneratingAiSummary}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isGeneratingAiSummary ? 'animate-spin' : ''}`} />
                    Neu generieren
                  </Button>
                </h4>
                <div className="bg-muted/30 p-3 rounded">
                  <p className="text-sm">{localAiSummary}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-medium mb-2">KI-Zusammenfassung</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={generateAiSummary}
                  disabled={isGeneratingAiSummary}
                >
                  {isGeneratingAiSummary ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Wird generiert...
                    </>
                  ) : (
                    <>
                      KI-Zusammenfassung generieren
                    </>
                  )}
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
      
      <CardFooter className="flex flex-col space-y-3 pt-2">
        <div className="flex flex-wrap gap-1">
          {categories?.slice(0, 3).map((category, index) => (
            <Badge key={index} variant="secondary">{category}</Badge>
          ))}
        </div>
        <div className="w-full flex items-center gap-2">
          <Button 
            className="flex-1 flex items-center gap-2" 
            variant="outline"
            onClick={() => window.open(link, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Artikel lesen
          </Button>
          
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Artikel löschen</span>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default NewsCard;
