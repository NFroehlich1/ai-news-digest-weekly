
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Rss } from "lucide-react";

interface HeaderProps {
  onApiKeySet: (apiKey: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

const Header = ({ onApiKeySet, onRefresh, loading }: HeaderProps) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isApiKeyVisible, setIsApiKeyVisible] = useState<boolean>(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("Bitte gib einen API-Schlüssel ein.");
      return;
    }
    
    onApiKeySet(apiKey.trim());
    toast.success("API-Schlüssel gespeichert!");
    setIsApiKeyVisible(false);
  };
  
  return (
    <header className="border-b bg-card shadow-sm">
      <div className="container mx-auto py-4 px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Rss className="h-6 w-6 text-decoder-blue" />
          <h1 className="text-2xl font-bold gradient-text">KI News Digest</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {!isApiKeyVisible ? (
            <Button 
              variant="outline" 
              onClick={() => setIsApiKeyVisible(true)}
            >
              API-Schlüssel setzen
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API-Schlüssel eingeben"
                className="min-w-[250px]"
              />
              <Button type="submit">Speichern</Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsApiKeyVisible(false)}
              >
                Abbrechen
              </Button>
            </form>
          )}
          
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
