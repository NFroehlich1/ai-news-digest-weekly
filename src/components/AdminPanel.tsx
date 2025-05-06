
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NewsletterManagement from "@/components/NewsletterManagement";
import NewsContentTab from "@/components/NewsContentTab";
import NewsletterHistory from "@/components/NewsletterHistory";
import NewsService from "@/services/NewsService";
import { toast } from "sonner";

interface AdminPanelProps {
  onExit: () => void;
}

const AdminPanel = ({ onExit }: AdminPanelProps) => {
  const [currentTab, setCurrentTab] = useState<string>("manage");
  const [newsService, setNewsService] = useState<NewsService | null>(null);

  // Initialize NewsService
  useEffect(() => {
    const service = new NewsService();
    setNewsService(service);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Newsletter-Verwaltung</h1>
        <Button 
          variant="outline" 
          onClick={onExit}
        >
          Zurück zum Abonnieren
        </Button>
      </div>
      
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="manage">Newsletter-Versand</TabsTrigger>
          <TabsTrigger value="history">Newsletter-Archiv</TabsTrigger>
          <TabsTrigger value="news">KI-News-Generator</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manage" className="space-y-6">
          <NewsletterManagement />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <NewsletterHistory />
        </TabsContent>
        
        <TabsContent value="news" className="space-y-6">
          <NewsContentTab newsService={newsService} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
