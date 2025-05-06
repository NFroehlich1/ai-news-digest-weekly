
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NewsletterManagement = () => {
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const loadSubscriberCount = async () => {
    setIsLoadingSubscribers(true);
    try {
      const { count, error } = await supabase
        .from("newsletter_subscribers")
        .select("*", { count: 'exact', head: true })
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
      const response = await supabase.functions.invoke("newsletter-send");
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      toast.success("Newsletter wurde erfolgreich versendet!");
    } catch (error) {
      console.error("Fehler beim Versenden des Newsletters:", error);
      toast.error("Newsletter konnte nicht versendet werden.");
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
