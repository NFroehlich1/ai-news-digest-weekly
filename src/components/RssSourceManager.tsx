
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RssSource } from "@/services/NewsService";
import { Rss, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface RssSourceManagerProps {
  sources: RssSource[];
  onAddSource: (url: string, name: string) => boolean;
  onRemoveSource: (url: string) => boolean;
  onToggleSource: (url: string, enabled: boolean) => boolean;
  onRefresh: () => void;
}

const RssSourceManager = ({
  sources,
  onAddSource,
  onRemoveSource,
  onToggleSource,
  onRefresh,
}: RssSourceManagerProps) => {
  const [open, setOpen] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  
  const handleAddSource = () => {
    if (!newSourceUrl.trim()) {
      toast.error("Bitte geben Sie eine URL ein");
      return;
    }
    
    if (onAddSource(newSourceUrl.trim(), newSourceName.trim())) {
      setNewSourceUrl("");
      setNewSourceName("");
      setOpen(false);
      onRefresh();
    }
  };
  
  const handleRemoveSource = (url: string) => {
    if (onRemoveSource(url)) {
      onRefresh();
    }
  };
  
  const handleToggleSource = (url: string, enabled: boolean) => {
    if (onToggleSource(url, enabled)) {
      onRefresh();
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rss className="h-5 w-5" />
          RSS-Quellen
        </CardTitle>
        <CardDescription>
          RSS-Quellen verwalten und neue hinzufügen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sources.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Keine RSS-Quellen vorhanden. Fügen Sie eine hinzu.
            </p>
          ) : (
            sources.map((source, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2">
                <div className="space-y-1">
                  <p className="font-medium">{source.name}</p>
                  <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                    {source.url}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`source-${index}`}
                      checked={source.enabled}
                      onCheckedChange={(checked) => handleToggleSource(source.url, checked)}
                    />
                    <Label htmlFor={`source-${index}`} className="text-sm">
                      {source.enabled ? "Aktiv" : "Inaktiv"}
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSource(source.url)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full flex items-center gap-2">
              <Plus className="h-4 w-4" />
              RSS-Quelle hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>RSS-Quelle hinzufügen</DialogTitle>
              <DialogDescription>
                Fügen Sie eine neue RSS-Quelle hinzu, um Nachrichten zu importieren.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="url">RSS-Feed URL</Label>
                <Input
                  id="url"
                  placeholder="https://beispiel.de/feed"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="Quellen-Name"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddSource}>Hinzufügen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

export default RssSourceManager;
