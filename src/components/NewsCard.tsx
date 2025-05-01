
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RssItem } from "@/types/newsTypes";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/dateUtils";

interface NewsCardProps {
  item: RssItem;
}

const NewsCard = ({ item }: NewsCardProps) => {
  const { title, link, pubDate, description, categories, sourceName, aiSummary } = item;
  
  // Only use imageUrl if it passes basic validation
  const validateImageUrl = (url?: string): boolean => {
    if (!url) return false;
    // Check for common image extensions
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
  };
  
  const imageUrl = validateImageUrl(item.imageUrl) ? item.imageUrl : null;
  
  return (
    <Card className="overflow-hidden h-full flex flex-col">
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
      <CardContent className="flex-grow">
        <p className="text-sm line-clamp-3">{aiSummary || description}</p>
        {aiSummary && description && description !== aiSummary && (
          <div className="mt-2">
            <Badge variant="secondary">AI Zusammenfassung</Badge>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-3 pt-2">
        <div className="flex flex-wrap gap-1">
          {categories?.slice(0, 3).map((category, index) => (
            <Badge key={index} variant="secondary">{category}</Badge>
          ))}
        </div>
        <Button 
          className="w-full flex items-center gap-2" 
          variant="outline"
          onClick={() => window.open(link, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Artikel lesen
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NewsCard;
