
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { toast } from "sonner";

interface AdminLoginFormProps {
  onCancel: () => void;
  onSuccessfulLogin: () => void;
}

const AdminLoginForm = ({ onCancel, onSuccessfulLogin }: AdminLoginFormProps) => {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // The admin password - in a production environment, this should be stored securely
  const ADMIN_PASSWORD = "Test_1082?!";
  
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simple password check
    if (password === ADMIN_PASSWORD) {
      onSuccessfulLogin();
      toast.success("Administrator-Modus aktiviert");
    } else {
      toast.error("Falsches Passwort");
    }
    
    setPassword("");
    setIsSubmitting(false);
  };
  
  return (
    <form onSubmit={handleAdminLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-password">Administrator-Passwort</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            placeholder="Geben Sie das Administrator-Passwort ein"
            autoFocus
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          className="flex-1"
          onClick={onCancel}
        >
          Abbrechen
        </Button>
        <Button 
          type="submit" 
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Prüfe..." : "Anmelden"}
        </Button>
      </div>
    </form>
  );
};

export default AdminLoginForm;
