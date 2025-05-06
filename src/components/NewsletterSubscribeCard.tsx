
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import NewsletterSubscribeForm from "@/components/NewsletterSubscribeForm";
import AdminLoginForm from "@/components/AdminLoginForm";

interface NewsletterSubscribeCardProps {
  onAdminLogin: () => void;
}

const NewsletterSubscribeCard = ({ onAdminLogin }: NewsletterSubscribeCardProps) => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 rounded-full bg-primary/10 p-3 w-fit">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">KI-Newsletter abonnieren</CardTitle>
        <CardDescription>
          Erhalten Sie jeden Dienstag die wichtigsten KI-Nachrichten direkt in Ihrem Postfach.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showAdminLogin ? (
          <AdminLoginForm
            onCancel={() => setShowAdminLogin(false)}
            onSuccessfulLogin={onAdminLogin}
          />
        ) : (
          <NewsletterSubscribeForm />
        )}
      </CardContent>
      <CardFooter className="flex flex-col text-sm text-muted-foreground">
        <p className="text-center mb-2">
          Wir versenden unseren Newsletter einmal pro Woche.
        </p>
        <p className="text-center">
          Sie können sich jederzeit vom Newsletter abmelden.
        </p>
        {!showAdminLogin && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 text-xs text-muted-foreground"
            onClick={() => setShowAdminLogin(true)}
          >
            Administrator-Zugang
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default NewsletterSubscribeCard;
