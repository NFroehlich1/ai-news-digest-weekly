
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
import { Mail, Check } from "lucide-react";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";

interface NewsletterSubscribeModalProps {
  newsletterContent?: string;
}

// Form validation schema
const formSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein.")
});

const NewsletterSubscribeModal = ({ newsletterContent }: NewsletterSubscribeModalProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Initialize form with validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Check if email already exists in subscribers table
      const { data: existingSubscriber, error: checkError } = await supabase
        .from('newsletter_subscribers' as any)
        .select('email')
        .eq('email', values.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // Error other than "no rows returned"
        console.error("Error checking subscriber:", checkError);
        toast.error("Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
        return;
      }

      if (existingSubscriber) {
        toast.info("Diese E-Mail ist bereits registriert. Vielen Dank für Ihr Interesse!");
        setIsSuccess(true);
      } else {
        // Insert new subscriber
        const { error: insertError } = await supabase
          .from('newsletter_subscribers' as any)
          .insert([{ email: values.email }] as any);

        if (insertError) {
          console.error("Error adding subscriber:", insertError);
          toast.error("Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
          return;
        }

        // Show success message
        setIsSuccess(true);
        toast.success("Vielen Dank für Ihr Interesse! Sie erhalten bald eine Bestätigungs-E-Mail.");
      }
      
      // Reset success state after 3 seconds and close dialog
      setTimeout(() => {
        setIsSuccess(false);
        setOpen(false);
        form.reset();
      }, 3000);
    } catch (error) {
      console.error("Fehler beim Abonnieren:", error);
      toast.error("Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Mail className="h-4 w-4" />
          Newsletter abonnieren
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>KI-Newsletter abonnieren</DialogTitle>
          <DialogDescription>
            Erhalten Sie jeden Dienstagmorgen die wichtigsten KI-Nachrichten direkt in Ihrem Postfach.
          </DialogDescription>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="py-6 text-center">
            <div className="mx-auto rounded-full bg-green-100 p-3 w-fit mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Anmeldung erfolgreich!</h3>
            <p className="text-muted-foreground">
              Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen gesendet haben.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Mail-Adresse</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ihre.email@example.com" 
                        type="email"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Wir verwenden Ihre E-Mail-Adresse nur für den Versand des Newsletters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Wird abonniert..." : "Abonnieren"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewsletterSubscribeModal;
