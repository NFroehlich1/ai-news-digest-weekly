
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Mail, RefreshCw, Trash2 } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import LocalNewsletterService from "@/services/LocalNewsletterService";
import { LocalNewsletter } from "@/types/newsletterTypes";

const NewsletterHistory = () => {
  const [newsletters, setNewsletters] = useState<LocalNewsletter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNewsletter, setSelectedNewsletter] = useState<LocalNewsletter | null>(null);
  const [page, setPage] = useState(1);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const itemsPerPage = 5;

  // Initialisieren des lokalen Newsletter-Services
  const newsletterService = new LocalNewsletterService();

  useEffect(() => {
    loadNewsletters();
  }, []);

  const loadNewsletters = async () => {
    setIsLoading(true);
    try {
      const data = await newsletterService.getNewsletters();
      setNewsletters(data || []);
      
      // Wähle den ersten Newsletter aus, wenn verfügbar
      if (data && data.length > 0) {
        setSelectedNewsletter(data[0]);
      }
      
      if (data.length === 0) {
        toast.info("Keine Newsletter im lokalen Speicher gefunden.");
      }
    } catch (error) {
      console.error("Fehler beim Laden der Newsletter:", error);
      toast.error("Newsletter konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoData = async () => {
    setIsGeneratingDemo(true);
    try {
      await newsletterService.generateDemoData();
      await loadNewsletters();
      toast.success("Demo-Newsletter wurden generiert und gespeichert.");
    } catch (error) {
      console.error("Fehler beim Generieren der Demo-Daten:", error);
      toast.error("Demo-Daten konnten nicht generiert werden.");
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const clearAllNewsletters = async () => {
    try {
      await newsletterService.clearNewsletters();
      setNewsletters([]);
      setSelectedNewsletter(null);
      toast.success("Alle Newsletter wurden gelöscht.");
    } catch (error) {
      console.error("Fehler beim Löschen der Newsletter:", error);
      toast.error("Newsletter konnten nicht gelöscht werden.");
    }
  };

  const totalPages = Math.ceil(newsletters.length / itemsPerPage);
  const paginatedNewsletters = newsletters.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Newsletter-Archiv (Lokal)
              </CardTitle>
              <CardDescription>
                Lokal gespeicherte Newsletter anzeigen
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={loadNewsletters} 
                variant="outline" 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
              <Button 
                onClick={generateDemoData} 
                variant="outline" 
                disabled={isGeneratingDemo}
              >
                Demo-Daten
              </Button>
              <Button 
                onClick={clearAllNewsletters} 
                variant="outline" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Alle löschen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-4">Newsletter werden geladen...</p>
          ) : newsletters.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine gespeicherten Newsletter gefunden.</p>
              <p className="text-muted-foreground text-sm mt-2">
                Generieren Sie Demo-Daten oder speichern Sie einen neuen Newsletter.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Betreff</TableHead>
                    <TableHead>Empfänger</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedNewsletters.map((newsletter) => (
                    <TableRow 
                      key={newsletter.id}
                      className={newsletter.id === selectedNewsletter?.id ? "bg-muted" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(newsletter.sent_at)}
                        </div>
                      </TableCell>
                      <TableCell>{newsletter.subject}</TableCell>
                      <TableCell>{newsletter.recipients_count}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedNewsletter(newsletter)}
                        >
                          Anzeigen
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={page === i + 1}
                          onClick={() => setPage(i + 1)}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  </PaginationContent>
                </Pagination>
              )}
              
              {selectedNewsletter && (
                <div className="mt-6 border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2">
                    {selectedNewsletter.subject}
                  </h3>
                  <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedNewsletter.sent_at)}
                  </div>
                  <div 
                    className="newsletter-body"
                    dangerouslySetInnerHTML={{ __html: selectedNewsletter.content }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NewsletterHistory;
