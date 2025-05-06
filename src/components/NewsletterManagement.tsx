
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Send, Mail, User, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const NewsletterManagement = () => {
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Newsletter content and sender details
  const [subject, setSubject] = useState<string>(`KI-Newsletter vom ${new Date().toLocaleDateString('de-DE')}`);
  const [customContent, setCustomContent] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("KI-Newsletter");
  const [senderEmail, setSenderEmail] = useState<string>("newsletter@decoderproject.com");
  const [useCustomContent, setUseCustomContent] = useState<boolean>(false);

  const loadSubscriberCount = async () => {
    setIsLoadingSubscribers(true);
    try {
      const { count, error } = await supabase
        .from('newsletter_subscribers' as any)
        .select('*', { count: 'exact', head: true })
        .eq("confirmed", true);
      
      if (error) throw error;
      setSubscriberCount(count);
    } catch (error) {
      console.error("Fehler beim Laden der Abonnenten:", error);
      toast.error("Abonnenten konnten nicht geladen werden.");
    } finally {
      setIsLoadingSubscribers(false);
    }
  };

  const handleSendNewsletter = async () => {
    setIsSending(true);
    try {
      // Prepare data to send
      const newsletterData = {
        subject,
        senderName,
        senderEmail,
        customContent: useCustomContent ? customContent : null
      };

      const response = await supabase.functions.invoke("newsletter-send", {
        body: newsletterData
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      toast.success("Newsletter wurde erfolgreich versendet!");
    } catch (error: any) {
      console.error("Fehler beim Versenden des Newsletters:", error);
      toast.error("Newsletter konnte nicht versendet werden: " + (error.message || "Unbekannter Fehler"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Newsletter-Verwaltung</CardTitle>
        <CardDescription>
          Verwalten Sie Ihre Newsletter-Einstellungen und versenden Sie Newsletter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="basic">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="basic">Grundeinstellungen</TabsTrigger>
            <TabsTrigger value="content">Newsletter-Inhalt</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscriber-count">Abonnenten</Label>
              <div className="flex gap-2">
                <Input
                  id="subscriber-count"
                  value={subscriberCount !== null ? `${subscriberCount} bestätigte Abonnenten` : "Klicken Sie auf 'Laden'"}
                  readOnly
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={loadSubscriberCount} 
                  disabled={isLoadingSubscribers}
                >
                  {isLoadingSubscribers ? "Lädt..." : "Laden"}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schedule-date">Versandzeitpunkt</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="schedule-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sender-name">Absender-Name</Label>
              <div className="flex-1 relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="sender-name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="pl-9"
                  placeholder="KI-Newsletter"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sender-email">Absender-E-Mail</Label>
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="sender-email"
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="pl-9"
                  placeholder="newsletter@example.com"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Newsletter-Betreff</Label>
              <div className="flex-1 relative">
                <Pencil className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="pl-9"
                  placeholder="KI-Newsletter vom DD.MM.YYYY"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox" 
                id="use-custom-content"
                checked={useCustomContent}
                onChange={(e) => setUseCustomContent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="use-custom-content" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Benutzerdefinierten Inhalt verwenden
              </Label>
            </div>
            
            {useCustomContent && (
              <div className="space-y-2">
                <Label htmlFor="email-content">Newsletter-Inhalt (HTML unterstützt)</Label>
                <Textarea
                  id="email-content"
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="<p>Hier können Sie den Inhalt Ihres Newsletters eingeben...</p>"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleSendNewsletter}
          disabled={isSending}
        >
          <Send className="mr-2 h-4 w-4" />
          {isSending ? "Newsletter wird gesendet..." : "Newsletter jetzt senden"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NewsletterManagement;
