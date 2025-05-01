
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Rss, Key } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface HeaderProps {
  onApiKeySet: (apiKey: string) => void;
  onRefresh: () => void;
  loading: boolean;
  defaultApiKey?: string;
}

const Header = ({ onApiKeySet, onRefresh, loading, defaultApiKey }: HeaderProps) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState<boolean>(false);
  
  // Initialize with default API key if provided
  useEffect(() => {
    if (defaultApiKey) {
      setApiKey(defaultApiKey);
    }
  }, [defaultApiKey]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("Bitte gib einen API-Schlüssel ein.");
      return;
    }
    
    onApiKeySet(apiKey.trim());
    toast.success("API-Schlüssel gespeichert!");
    setApiKeyDialogOpen(false);
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
                <DialogTitle>API-Schlüssel Einstellungen</DialogTitle>
                <DialogDescription>
                  Geben Sie einen gültigen API-Schlüssel für die Google/Gemini API ein. 
                  Der Schlüssel wird lokal in Ihrem Browser gespeichert.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="API-Schlüssel eingeben"
                    className="w-full"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Speichern</Button>
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
