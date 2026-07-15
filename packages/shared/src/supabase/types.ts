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

// A dashboard version (phase 8). The printed-QR default keeps slug 'default'
// and is_default = true; it can never be deleted nor renamed.
export interface DashboardRow {
  id: string;
  slug: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface DashboardInsert {
  id?: string;
  slug: string;
  name?: string;
  is_default?: boolean;
  created_at?: string;
}

// A widgets row. `config` stays `unknown` (validated per-type by the registry
// Zod schema in the web app); `layout` is typed to the shared model.
// `dashboard_id` is optional in the type so pre-migration reads (no column)
// stay valid — the DB requires it once migration 0007 has run.
export interface WidgetRow {
  id: string;
  type: WidgetType;
  config: unknown;
  layout: WidgetBreakpointLayout;
  visible: boolean;
  position: number;
  created_at: string;
  dashboard_id?: string;
}

export interface WidgetInsert {
  id?: string;
  type: WidgetType;
  config: unknown;
  layout: WidgetBreakpointLayout;
  visible?: boolean;
  position?: number;
  created_at?: string;
  dashboard_id?: string;
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

// A free header chip beyond the built-in "available" and "location" ones.
export interface SiteChip {
  label: string;
}

// The single-row header settings that drive the /qrcode header.
export interface SiteSettingsRow {
  id: number;
  name: string;
  tagline: string;
  available_text: string;
  available_show: boolean;
  location: string;
  location_show: boolean;
  chips: SiteChip[];
  updated_at: string;
  // Admin presence (phase 4.8 C1) — written by the mobile app on launch.
  // Optional so older rows / pre-migration reads stay valid.
  tz?: string | null;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  presence_updated_at?: string | null;
  // Status/mood moved from a grid widget into the header (phase 4.8 B2).
  status_emoji?: string;
  status_text?: string;
  status_moods?: { emoji: string; text: string }[];
  // Dashboard version this header belongs to (phase 8). Optional so
  // pre-migration reads (no column) stay valid.
  dashboard_id?: string;
}

export type SiteSettingsUpdate = Partial<Omit<SiteSettingsRow, "id" | "updated_at">>;

// Widget QA status per (type, format) — phase 9. Admin-only table (RLS reserves
// read AND write to authenticated). `validated_hash` is the widget-code hash a
// human last approved; a couple is "to verify" when it's null or ≠ current hash.
export type WidgetQaStatus = "pending" | "ok" | "issue";

export interface WidgetQaRow {
  widget_type: string;
  format: string;
  validated_hash: string | null;
  status: WidgetQaStatus;
  note: string | null;
  screenshot_url: string | null;
  updated_at: string;
}

export type WidgetQaInsert = {
  widget_type: string;
  format: string;
  validated_hash?: string | null;
  status?: WidgetQaStatus;
  note?: string | null;
  screenshot_url?: string | null;
  updated_at?: string;
};

export interface Database {
  public: {
    Tables: {
      dashboards: {
        Row: DashboardRow;
        Insert: DashboardInsert;
        Update: Partial<DashboardInsert>;
        Relationships: [];
      };
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
      site_settings: {
        Row: SiteSettingsRow;
        Insert: Partial<SiteSettingsRow> & { id?: number };
        Update: SiteSettingsUpdate;
        Relationships: [];
      };
      widget_qa: {
        Row: WidgetQaRow;
        Insert: WidgetQaInsert;
        Update: Partial<WidgetQaInsert>;
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
