
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RssItem } from "@/types/newsTypes";
import { ExternalLink, Trash, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/dateUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NewsCardProps {
  item: RssItem;
  isLoading?: boolean;
  onDelete?: (item: RssItem) => void;
}

const NewsCard = ({ item, isLoading = false, onDelete }: NewsCardProps) => {
  const { title, link, pubDate, description, categories, sourceName, aiSummary, content } = item;
  const [isOpen, setIsOpen] = useState(false);
  
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
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-grow">
        <CardContent className="pb-0">
          {!isOpen && (
            <p className="text-sm line-clamp-3 mb-2">{description}</p>
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
            <div className="mt-4 border-t pt-4">
              <p className="text-sm mb-4">{description}</p>
              
              <h4 className="text-sm font-medium mb-2">KI-Zusammenfassung</h4>
              {aiSummary ? (
                <p className="text-sm">{aiSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Keine KI-Zusammenfassung verfügbar.</p>
              )}
              
              {content && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Artikel-Inhalt</h4>
                  <p className="text-sm">{content}</p>
                </div>
              )}
            </div>
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
              <Trash className="h-4 w-4" />
              <span className="sr-only">Artikel löschen</span>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default NewsCard;
