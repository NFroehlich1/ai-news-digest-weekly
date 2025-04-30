
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail } from "lucide-react";

interface NewsletterSubscribeModalProps {
  newsletterContent?: string;
}

const NewsletterSubscribeModal = ({ newsletterContent }: NewsletterSubscribeModalProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !email.includes('@')) {
      toast.error("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real application, this would send the email to a backend service
      // For demo purposes, we'll simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Vielen Dank für Ihr Interesse! Der Newsletter wurde an Ihre E-Mail-Adresse gesendet.");
      setEmail("");
      
      // In a real application, you would close the dialog here
      // dialogRef.current?.close();
    } catch (error) {
      console.error("Fehler beim Abonnieren:", error);
      toast.error("Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Mail className="h-4 w-4" />
          Newsletter abonnieren
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Newsletter abonnieren</DialogTitle>
          <DialogDescription>
            Erhalten Sie wöchentlich die wichtigsten KI-Nachrichten direkt in Ihrem Postfach.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              id="email"
              type="email"
              placeholder="ihre.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              required
            />
            <p className="text-sm text-muted-foreground">
              Wir verwenden Ihre E-Mail-Adresse nur für den Versand des Newsletters.
            </p>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Wird abonniert..." : "Abonnieren"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewsletterSubscribeModal;
