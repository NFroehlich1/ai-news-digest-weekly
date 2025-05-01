
import { useState } from "react";
import { RssItem } from "@/services/NewsService";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/services/NewsService";
import { Check, FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ArticleSelectorProps {
  articles: RssItem[];
  onSubmit: (selectedArticles: RssItem[]) => void;
  onCancel: () => void;
}

const ArticleSelector = ({ articles, onSubmit, onCancel }: ArticleSelectorProps) => {
  const [selectedArticles, setSelectedArticles] = useState<RssItem[]>([]);
  
  const toggleArticle = (article: RssItem) => {
    if (selectedArticles.some(item => item.link === article.link)) {
      setSelectedArticles(selectedArticles.filter(item => item.link !== article.link));
    } else {
      setSelectedArticles([...selectedArticles, article]);
    }
  };
  
  const isSelected = (article: RssItem) => {
    return selectedArticles.some(item => item.link === article.link);
  };
  
  const handleSubmit = () => {
    onSubmit(selectedArticles);
  };
  
  const openArticleLink = (e: React.MouseEvent, link: string) => {
    e.stopPropagation(); // Prevent row click event
    window.open(link, '_blank');
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Artikel für Newsletter auswählen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="mb-4 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {selectedArticles.length} von {articles.length} Artikeln ausgewählt
            </span>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedArticles([])}
                disabled={selectedArticles.length === 0}
              >
                Auswahl zurücksetzen
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedArticles([...articles])}
                disabled={selectedArticles.length === articles.length}
              >
                Alle auswählen
              </Button>
            </div>
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Artikel</TableHead>
                  <TableHead className="w-48">Datum</TableHead>
                  <TableHead className="w-48">Quelle</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article, index) => (
                  <TableRow 
                    key={index} 
                    className={isSelected(article) ? "bg-muted/50" : ""}
                    onClick={() => toggleArticle(article)}
                  >
                    <TableCell className="cursor-pointer">
                      <Checkbox 
                        checked={isSelected(article)}
                        onCheckedChange={() => toggleArticle(article)}
                      />
                    </TableCell>
                    <TableCell className="cursor-pointer">
                      <div>
                        <p className="font-medium">{article.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {article.description}
                        </p>
                        {article.categories && article.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {article.categories.slice(0, 2).map((category, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{category}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="cursor-pointer">
                      {formatDate(article.pubDate)}
                    </TableCell>
                    <TableCell className="cursor-pointer">
                      {article.sourceName || "Unbekannt"}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => openArticleLink(e, article.link)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">Artikel öffnen</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={selectedArticles.length === 0}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {selectedArticles.length} Artikel verwenden
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArticleSelector;
