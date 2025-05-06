
import { useState } from "react";
import { toast } from "sonner";
import NewsletterSubscribeCard from "@/components/NewsletterSubscribeCard";
import AdminPanel from "@/components/AdminPanel";

const Newsletter = () => {
  const [adminMode, setAdminMode] = useState(false);

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      {adminMode ? (
        <AdminPanel onExit={() => setAdminMode(false)} />
      ) : (
        <NewsletterSubscribeCard onAdminLogin={() => setAdminMode(true)} />
      )}
    </div>
  );
};

export default Newsletter;
