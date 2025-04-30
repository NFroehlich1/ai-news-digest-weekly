
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import NewsCard from "./NewsCard";
import { WeeklyDigest as WeeklyDigestType } from "@/services/NewsService";
import DecoderService from "@/services/DecoderService";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from 'react-markdown';

interface WeeklyDigestProps {
  digest: WeeklyDigestType;
  apiKey: string;
}

const WeeklyDigest = ({ digest, apiKey }: WeeklyDigestProps) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(digest.generatedContent || null);
  const [activeTab, setActiveTab] = useState<string>("news");
  
  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    
    try {
      const decoderService = new DecoderService(apiKey);
      const summary = await decoderService.generateSummary(digest);
      
      if (summary) {
        setGeneratedContent(summary);
        setActiveTab("summary");
        toast.success("Zusammenfassung erfolgreich generiert!");
      } else {
        toast.error("Fehler bei der Generierung der Zusammenfassung.");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error(`Fehler: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl md:text-2xl font-bold">
            KI-Update KW {digest.weekNumber}
          </CardTitle>
          <p className="text-muted-foreground">{digest.dateRange}</p>
        </div>
        <Button 
          onClick={handleGenerateSummary} 
          disabled={isGenerating}
          className="shrink-0"
        >
          {isGenerating ? "Wird generiert..." : generatedContent ? "Neu generieren" : "Zusammenfassen"}
        </Button>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="news">Nachrichten</TabsTrigger>
            <TabsTrigger value="summary" disabled={!generatedContent}>Zusammenfassung</TabsTrigger>
          </TabsList>
          
          <TabsContent value="news">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {digest.items.map((item, index) => (
                <NewsCard key={index} item={item} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="summary">
            {generatedContent ? (
              <div className="newsletter-body bg-white rounded-md p-6 shadow-sm">
                <ReactMarkdown>{generatedContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WeeklyDigest;
