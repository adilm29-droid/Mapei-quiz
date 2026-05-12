export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          id: string
          quiz_id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          quiz_id: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          quiz_id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          code: string
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          name: string
          quiz_id: string | null
          scope: string
          threshold: Json
          tier_color: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          display_order?: number
          icon: string
          id: string
          name: string
          quiz_id?: string | null
          scope: string
          threshold: Json
          tier_color: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          name?: string
          quiz_id?: string | null
          scope?: string
          threshold?: Json
          tier_color?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action_type: string
          admin_user_id: string
          affected_user_id: string | null
          created_at: string
          id: string
          payload: Json
          reason: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          affected_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          reason?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          affected_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_affected_user_id_fkey"
            columns: ["affected_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          answers: Json
          attempt_number: number
          created_at: string
          current_question_index: number
          deleted_at: string | null
          expires_at: string
          final_score: number | null
          id: string
          ip_address: unknown
          is_complete: boolean
          is_incomplete: boolean
          is_leaderboard_attempt: boolean
          option_orders: Json
          pdf_url: string | null
          question_order: Json
          quiz_id: string
          started_at: string
          submitted_at: string | null
          time_taken_seconds: number | null
          user_agent: string | null
          user_id: string
          xp_awarded: number
        }
        Insert: {
          answers?: Json
          attempt_number: number
          created_at?: string
          current_question_index?: number
          deleted_at?: string | null
          expires_at: string
          final_score?: number | null
          id?: string
          ip_address?: unknown
          is_complete?: boolean
          is_incomplete?: boolean
          is_leaderboard_attempt?: boolean
          option_orders?: Json
          pdf_url?: string | null
          question_order: Json
          quiz_id: string
          started_at?: string
          submitted_at?: string | null
          time_taken_seconds?: number | null
          user_agent?: string | null
          user_id: string
          xp_awarded?: number
        }
        Update: {
          answers?: Json
          attempt_number?: number
          created_at?: string
          current_question_index?: number
          deleted_at?: string | null
          expires_at?: string
          final_score?: number | null
          id?: string
          ip_address?: unknown
          is_complete?: boolean
          is_incomplete?: boolean
          is_leaderboard_attempt?: boolean
          option_orders?: Json
          pdf_url?: string | null
          question_order?: Json
          quiz_id?: string
          started_at?: string
          submitted_at?: string | null
          time_taken_seconds?: number | null
          user_agent?: string | null
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string
          code: string
          condition_json: Json
          created_at: string
          description: string
          gradient: string
          icon_name: string
          id: string
          name: string
        }
        Insert: {
          category: string
          code: string
          condition_json?: Json
          created_at?: string
          description: string
          gradient: string
          icon_name: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          code?: string
          condition_json?: Json
          created_at?: string
          description?: string
          gradient?: string
          icon_name?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          error_message: string | null
          id: string
          payload: Json
          sent_at: string
          status: string
          subject: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          payload?: Json
          sent_at?: string
          status?: string
          subject?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          payload?: Json
          sent_at?: string
          status?: string
          subject?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_counters: {
        Row: {
          attempt_count: number
          created_at: string
          last_practiced_at: string
          practice_dates: string[]
          quiz_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          last_practiced_at?: string
          practice_dates?: string[]
          quiz_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          last_practiced_at?: string
          practice_dates?: string[]
          quiz_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_counters_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          category: string | null
          correct_answer: string
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          order_index: number
          points: number
          question_text: string
          quiz_id: string
        }
        Insert: {
          category?: string | null
          correct_answer: string
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          order_index?: number
          points?: number
          question_text: string
          quiz_id: string
        }
        Update: {
          category?: string | null
          correct_answer?: string
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          order_index?: number
          points?: number
          question_text?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_unlocked: boolean
          leaderboard_revealed_at: string | null
          leaderboard_visible: boolean
          max_score: number | null
          practice_for_quiz_id: string | null
          title: string
          type: string
          unlocked_at: string | null
          updated_at: string
          week_number: number
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_unlocked?: boolean
          leaderboard_revealed_at?: string | null
          leaderboard_visible?: boolean
          max_score?: number | null
          practice_for_quiz_id?: string | null
          title: string
          type?: string
          unlocked_at?: string | null
          updated_at?: string
          week_number: number
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_unlocked?: boolean
          leaderboard_revealed_at?: string | null
          leaderboard_visible?: boolean
          max_score?: number | null
          practice_for_quiz_id?: string | null
          title?: string
          type?: string
          unlocked_at?: string | null
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_practice_for_quiz_id_fkey"
            columns: ["practice_for_quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      reviewed_mistakes: {
        Row: {
          id: string
          question_id: string
          reviewed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          question_id: string
          reviewed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          question_id?: string
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviewed_mistakes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviewed_mistakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          unlock_count: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          unlock_count?: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          unlock_count?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active_badge_id: string | null
          avatar_url: string | null
          completed_quizzes_count: number
          created_at: string
          current_streak: number
          email: string
          first_name: string | null
          id: string
          last_active_at: string | null
          last_name: string | null
          last_quiz_date: string | null
          level: number
          longest_streak: number
          password_hash: string
          role: string
          status: string
          streak_freezes: number
          title: string
          total_xp: number
          updated_at: string
          username: string
          xp: number
        }
        Insert: {
          active_badge_id?: string | null
          avatar_url?: string | null
          completed_quizzes_count?: number
          created_at?: string
          current_streak?: number
          email: string
          first_name?: string | null
          id?: string
          last_active_at?: string | null
          last_name?: string | null
          last_quiz_date?: string | null
          level?: number
          longest_streak?: number
          password_hash: string
          role?: string
          status?: string
          streak_freezes?: number
          title?: string
          total_xp?: number
          updated_at?: string
          username: string
          xp?: number
        }
        Update: {
          active_badge_id?: string | null
          avatar_url?: string | null
          completed_quizzes_count?: number
          created_at?: string
          current_streak?: number
          email?: string
          first_name?: string | null
          id?: string
          last_active_at?: string | null
          last_name?: string | null
          last_quiz_date?: string | null
          level?: number
          longest_streak?: number
          password_hash?: string
          role?: string
          status?: string
          streak_freezes?: number
          title?: string
          total_xp?: number
          updated_at?: string
          username?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "users_active_badge_fk"
            columns: ["active_badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      seed_achievements_for_quiz: {
        Args: { p_quiz_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
