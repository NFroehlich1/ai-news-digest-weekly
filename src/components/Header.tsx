
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

const Header = ({ onApiKeySet, onRefresh, loading }: HeaderProps) => {
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [keyStatus, setKeyStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  
  // Check API key status on mount
  useEffect(() => {
    const checkApiKey = async () => {
      const decoderService = new DecoderService();
      try {
        const result = await decoderService.verifyApiKey();
        setKeyStatus(result.isValid ? 'valid' : 'invalid');
        if (result.isValid) {
          onApiKeySet('configured-in-supabase');
        }
      } catch (error) {
        setKeyStatus('invalid');
        console.error("Error checking API key:", error);
      }
    };
    
    checkApiKey();
  }, [onApiKeySet]);
  
  const handleVerifyKey = async () => {
    setIsVerifying(true);
    
    try {
      const decoderService = new DecoderService();
      console.log("Verifying Gemini API key via Supabase...");
      
      const result = await decoderService.verifyApiKey();
      
      if (result.isValid) {
        setKeyStatus('valid');
        onApiKeySet('configured-in-supabase');
        toast.success("Gemini API-Schlüssel erfolgreich verifiziert!");
        setApiKeyDialogOpen(false);
        console.log("✅ Gemini API key verification successful");
      } else {
        setKeyStatus('invalid');
        console.error("❌ Gemini API key verification failed:", result.message);
        toast.error(`API-Schlüssel Problem: ${result.message}`);
      }
    } catch (error) {
      setKeyStatus('invalid');
      console.error("API key verification error:", error);
      toast.error(`Fehler bei der Überprüfung: ${(error as Error).message}`);
    } finally {
      setIsVerifying(false);
    }
  };
  
  const getKeyStatusColor = () => {
    switch (keyStatus) {
      case 'valid': return 'text-green-600';
      case 'invalid': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  const getKeyStatusText = () => {
    switch (keyStatus) {
      case 'valid': return 'API-Schlüssel aktiv';
      case 'invalid': return 'API-Schlüssel fehlt';
      default: return 'Überprüfe API-Schlüssel...';
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
                <span className={getKeyStatusColor()}>{getKeyStatusText()}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gemini API-Schlüssel Status</DialogTitle>
                <DialogDescription>
                  Der Gemini API-Schlüssel wird sicher in Supabase verwaltet.
                  Sie können den Status überprüfen und bei Bedarf einen neuen Schlüssel konfigurieren.
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
              
              <div className="space-y-4 pt-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-4 w-4" />
                    <span className="font-medium">Aktueller Status:</span>
                  </div>
                  <p className={`text-sm ${getKeyStatusColor()}`}>
                    {getKeyStatusText()}
                  </p>
                  {keyStatus === 'invalid' && (
                    <p className="text-xs text-gray-600 mt-1">
                      Bitte kontaktieren Sie den Administrator, um den API-Schlüssel zu konfigurieren.
                    </p>
                  )}
                </div>
                
                <DialogFooter>
                  <Button 
                    onClick={handleVerifyKey} 
                    disabled={isVerifying}
                    className="flex items-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Wird überprüft...
                      </>
                    ) : (
                      <>Status überprüfen</>
                    )}
                  </Button>
                </DialogFooter>
              </div>
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
