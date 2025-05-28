export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      daily_raw_articles: {
        Row: {
          categories: string[] | null
          content: string | null
          created_at: string | null
          creator: string | null
          description: string | null
          fetched_at: string | null
          guid: string | null
          id: string
          image_url: string | null
          link: string | null
          processed: boolean | null
          pubdate: string | null
          source_name: string | null
          source_url: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          categories?: string[] | null
          content?: string | null
          created_at?: string | null
          creator?: string | null
          description?: string | null
          fetched_at?: string | null
          guid?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          processed?: boolean | null
          pubdate?: string | null
          source_name?: string | null
          source_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          categories?: string[] | null
          content?: string | null
          created_at?: string | null
          creator?: string | null
          description?: string | null
          fetched_at?: string | null
          guid?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          processed?: boolean | null
          pubdate?: string | null
          source_name?: string | null
          source_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      newsletter_archive: {
        Row: {
          article_count: number | null
          content: string
          created_at: string
          date_range: string
          html_content: string | null
          id: string
          title: string
          updated_at: string
          week_number: number
          year: number
        }
        Insert: {
          article_count?: number | null
          content: string
          created_at?: string
          date_range: string
          html_content?: string | null
          id?: string
          title: string
          updated_at?: string
          week_number: number
          year: number
        }
        Update: {
          article_count?: number | null
          content?: string
          created_at?: string
          date_range?: string
          html_content?: string | null
          id?: string
          title?: string
          updated_at?: string
          week_number?: number
          year?: number
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirmation_token: string | null
          confirmed: boolean | null
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          confirmation_token?: string | null
          confirmed?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          confirmation_token?: string | null
          confirmed?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      newsletters: {
        Row: {
          content: string
          id: string
          recipients_count: number
          sender_email: string
          sender_name: string
          sent_at: string
          subject: string
        }
        Insert: {
          content: string
          id?: string
          recipients_count?: number
          sender_email: string
          sender_name: string
          sent_at?: string
          subject: string
        }
        Update: {
          content?: string
          id?: string
          recipients_count?: number
          sender_email?: string
          sender_name?: string
          sent_at?: string
          subject?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
