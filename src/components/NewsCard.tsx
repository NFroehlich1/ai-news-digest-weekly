
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/services/NewsService";
import { RssItem } from "@/services/NewsService";

interface NewsCardProps {
  item: RssItem;
}

const NewsCard = ({ item }: NewsCardProps) => {
  const { title, link, pubDate, description, categories } = item;
  
  // Extract image from content if available
  const extractImage = (content: string): string | null => {
    const imgRegex = /<img[^>]+src="([^">]+)"/;
    const match = content.match(imgRegex);
    return match ? match[1] : null;
  };
  
  const imageUrl = item.imageUrl || extractImage(item.content || '');
  
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="overflow-hidden h-full news-card">
        {imageUrl && (
          <div className="h-48 overflow-hidden">
            <img 
              src={imageUrl} 
              alt={title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-lg line-clamp-3">{title}</CardTitle>
          <CardDescription>{formatDate(pubDate)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm line-clamp-3">{description}</p>
        </CardContent>
        <CardFooter>
          <div className="flex flex-wrap gap-1">
            {categories?.slice(0, 3).map((category, index) => (
              <Badge key={index} variant="secondary">{category}</Badge>
            ))}
          </div>
        </CardFooter>
      </Card>
    </a>
  );
};

export default NewsCard;
