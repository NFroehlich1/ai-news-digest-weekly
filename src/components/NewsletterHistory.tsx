
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

// Define a type for the newsletter items
type Newsletter = {
  id: string;
  subject: string;
  content: string;
  sender_name: string;
  sender_email: string;
  sent_at: string;
  recipients_count: number;
}

const NewsletterHistory = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadNewsletters();
  }, []);

  const loadNewsletters = async () => {
    setIsLoading(true);
    try {
      // Use type assertion with 'as any' to bypass TypeScript checking
      const { data, error } = await (supabase
        .from('newsletters' as any)
        .select('*')
        .order('sent_at', { ascending: false }));
      
      if (error) throw error;
      setNewsletters(data || []);
      
      // Select the first newsletter by default if available
      if (data && data.length > 0) {
        setSelectedNewsletter(data[0]);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Newsletter:", error);
      toast.error("Newsletter konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
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
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Newsletter-Archiv
          </CardTitle>
          <CardDescription>
            Früher versendete Newsletter anzeigen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-4">Newsletter werden geladen...</p>
          ) : newsletters.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine versendeten Newsletter gefunden.</p>
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
