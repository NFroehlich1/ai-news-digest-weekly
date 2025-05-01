
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/services/NewsService";
import { RssItem } from "@/services/NewsService";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewsCardProps {
  item: RssItem;
}

const NewsCard = ({ item }: NewsCardProps) => {
  const { title, link, pubDate, description, categories, sourceName } = item;
  
  // Extract image from content if available and validate it's a proper image URL
  const extractImage = (content: string): string | null => {
    const imgRegex = /<img[^>]+src="([^">]+)"/;
    const match = content.match(imgRegex);
    if (!match) return null;
    
    // Basic validation to ensure it's likely an image URL
    const url = match[1];
    const isLikelyImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
    return isLikelyImage ? url : null;
  };
  
  // Only use imageUrl if it passes basic validation
  const validateImageUrl = (url?: string): boolean => {
    if (!url) return false;
    // Check for common image extensions
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
  };
  
  const imageUrl = validateImageUrl(item.imageUrl) ? 
    item.imageUrl : 
    (item.content ? extractImage(item.content) : null);
  
  return (
    <Card className="overflow-hidden h-full news-card flex flex-col">
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
        <CardDescription className="flex items-center justify-between">
          <span>{formatDate(pubDate)}</span>
          {sourceName && <Badge variant="outline">{sourceName}</Badge>}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm line-clamp-3">{description}</p>
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
