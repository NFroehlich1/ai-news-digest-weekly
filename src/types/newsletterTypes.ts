
export interface LocalNewsletter {
  id: string;
  subject: string;
  content: string;
  sender_name: string;
  sender_email: string;
  sent_at: string;
  recipients_count: number;
}

export interface NewsletterStorage {
  saveNewsletter: (newsletter: LocalNewsletter) => Promise<void>;
  getNewsletters: () => Promise<LocalNewsletter[]>;
  clearNewsletters: () => Promise<void>;
}
