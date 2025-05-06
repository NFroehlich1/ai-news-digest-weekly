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

// Define a type for the newsletter
type Newsletter = {
  subject: string;
  content: string;
  sender_name: string;
  sender_email: string;
  sent_at: string;
  recipients_count: number;
}

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
  const [activeTab, setActiveTab] = useState("basic");
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const loadSubscriberCount = async () => {
    setIsLoadingSubscribers(true);
    try {
      const { count, error } = await supabase
        .from('newsletter_subscribers')
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

  const generatePreview = () => {
    let content = "";
    
    if (useCustomContent && customContent) {
      content = customContent;
    } else {
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">${senderName}</h1>
          <p>Willkommen zu unserem wöchentlichen KI-Newsletter.</p>
          <p>Hier sind die wichtigsten Neuigkeiten aus der Welt der Künstlichen Intelligenz:</p>
          <ul>
            <li>GPT-5 soll in den nächsten Monaten erscheinen</li>
            <li>Google stellt neue KI-Funktionen für Workspace vor</li>
            <li>EU einigt sich auf KI-Regulierung</li>
          </ul>
          <p style="margin-top: 30px; font-size: 14px; color: #777;">
            Sie erhalten diesen Newsletter, weil Sie sich dafür angemeldet haben. 
            <a href="#" style="color: #777;">Hier abmelden</a>
          </p>
        </div>
      `;
    }
    
    setPreviewHtml(content);
    setActiveTab("preview");
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
      
      const data = response.data;
      
      if (data.success) {
        toast.success(`Newsletter wurde an ${data.emailsSent} Abonnenten verarbeitet!`);
        
        // The edge function now handles storing the newsletter in the database
        // so we don't need to do it here anymore
      } else {
        throw new Error(data.message || "Unbekannter Fehler");
      }
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="basic">Grundeinstellungen</TabsTrigger>
            <TabsTrigger value="content">Newsletter-Inhalt</TabsTrigger>
            <TabsTrigger value="preview">Vorschau</TabsTrigger>
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
            
            <Button
              onClick={generatePreview}
              variant="outline"
              className="w-full mt-4"
            >
              Vorschau generieren
            </Button>
          </TabsContent>
          
          <TabsContent value="preview">
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <h3 className="text-lg font-medium mb-2">{subject}</h3>
                <div className="text-sm text-muted-foreground mb-4">
                  Von: {senderName} &lt;{senderEmail}&gt;
                </div>
                <div 
                  className="newsletter-body"
                  dangerouslySetInnerHTML={{ __html: previewHtml || "Klicken Sie auf 'Vorschau generieren', um eine Vorschau zu sehen." }}
                />
              </div>
            </div>
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
