
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Rss, Key, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DecoderService from "@/services/DecoderService";

interface HeaderProps {
  onApiKeySet: (apiKey: string) => void;
  onRefresh: () => void;
  loading: boolean;
  defaultApiKey?: string;
}

const Header = ({ onApiKeySet, onRefresh, loading, defaultApiKey = "AIzaSyAOG3IewUIIsB8oRYG2Lu-_2bM7ZrMBMFk" }: HeaderProps) => {
  const [apiKey, setApiKey] = useState<string>(defaultApiKey);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  
  // Initialize with default API key and immediately set it
  useEffect(() => {
    console.log("Header: Setting default API key:", defaultApiKey.substring(0, 10) + "...");
    setApiKey(defaultApiKey);
    onApiKeySet(defaultApiKey);
  }, [defaultApiKey, onApiKeySet]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("Bitte gib einen API-Schlüssel ein.");
      return;
    }
    
    setIsVerifying(true);
    
    try {
      console.log("Verifying Gemini API key:", apiKey.substring(0, 10) + "...");
      
      // Test the Gemini API key directly
      const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Hello, this is a test message."
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 50,
          }
        })
      });

      if (testResponse.ok) {
        onApiKeySet(apiKey.trim());
        toast.success("Gemini API-Schlüssel erfolgreich verifiziert!");
        setApiKeyDialogOpen(false);
        console.log("✅ Gemini API key verification successful");
      } else {
        const errorData = await testResponse.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP ${testResponse.status}`;
        console.error("❌ Gemini API key verification failed:", errorMessage);
        toast.error(`API-Schlüssel ungültig: ${errorMessage}`);
      }
    } catch (error) {
      console.error("API key verification error:", error);
      toast.error(`Fehler bei der Überprüfung: ${(error as Error).message}`);
    } finally {
      setIsVerifying(false);
    }
  };
  
  return (
    <header className="border-b bg-card shadow-sm">
      <div className="container mx-auto py-4 px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Rss className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold gradient-text">KI News Digest</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Key className="h-4 w-4" />
                API-Schlüssel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gemini API-Schlüssel Einstellungen</DialogTitle>
                <DialogDescription>
                  Geben Sie einen gültigen API-Schlüssel für die Google Gemini API ein. 
                  Der Schlüssel wird lokal in Ihrem Browser gespeichert.
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline block mt-2"
                  >
                    Hier können Sie einen neuen Gemini API-Schlüssel erstellen
                  </a>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Gemini API-Schlüssel eingeben"
                    className="w-full"
                  />
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={isVerifying}
                    className="flex items-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Wird verifiziert...
                      </>
                    ) : (
                      <>Speichern & Verifizieren</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={onRefresh} 
            disabled={loading}
            variant="default"
          >
            {loading ? "Wird geladen..." : "Aktualisieren"}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
