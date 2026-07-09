// Hand-written database types matching supabase/migrations/*.sql.
// Kept in sync manually (no codegen needed for this small schema).
import type { WidgetBreakpointLayout, WidgetType } from "../widget";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// A widgets row. `config` stays `unknown` (validated per-type by the registry
// Zod schema in the web app); `layout` is typed to the shared model.
export interface WidgetRow {
  id: string;
  type: WidgetType;
  config: unknown;
  layout: WidgetBreakpointLayout;
  visible: boolean;
  position: number;
  created_at: string;
}

export interface WidgetInsert {
  id?: string;
  type: WidgetType;
  config: unknown;
  layout: WidgetBreakpointLayout;
  visible?: boolean;
  position?: number;
  created_at?: string;
}

export type WidgetUpdate = Partial<WidgetInsert>;

export interface GuestbookRow {
  id: string;
  author: string;
  message: string;
  created_at: string;
}

export interface PollVoteRow {
  id: string;
  widget_id: string;
  option: string;
  voter_hash: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      widgets: {
        Row: WidgetRow;
        Insert: WidgetInsert;
        Update: WidgetUpdate;
        Relationships: [];
      };
      guestbook_messages: {
        Row: GuestbookRow;
        Insert: { id?: string; author: string; message: string; created_at?: string };
        Update: Partial<{ author: string; message: string }>;
        Relationships: [];
      };
      poll_votes: {
        Row: PollVoteRow;
        Insert: { id?: string; widget_id: string; option: string; voter_hash: string; created_at?: string };
        Update: Partial<PollVoteRow>;
        Relationships: [];
      };
      visits: {
        Row: { id: number; count: number };
        Insert: { id?: number; count?: number };
        Update: Partial<{ id: number; count: number }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_visits: { Args: Record<string, never>; Returns: number };
      get_visits: { Args: Record<string, never>; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
