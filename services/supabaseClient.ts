import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Fix: Import HistoryItem from the central types file to ensure type consistency across the app.
// Inlining the type created a separate declaration that conflicted with the one used in dataService.ts.
import { HistoryItem } from '../types';

// Inlined types are removed to use the single source of truth from types.ts

// Define the database type for type safety with Supabase client
// We are only typing the tables we interact with in this app.
export type Database = {
  public: {
    Tables: {
      bookmarks: {
        Row: {
          id: string;
          history_item: HistoryItem;
          created_at: string;
          folder_id: string | null;
        };
        // Fix: Relaxed Insert and Update types to be more flexible and avoid inference issues.
        Insert: {
          id?: string;
          history_item: HistoryItem;
          created_at?: string;
          folder_id: string | null;
        };
        Update: {
          id?: string;
          history_item?: HistoryItem;
          created_at?: string;
          folder_id?: string | null;
        };
        // FIX: Add empty Relationships array. The Supabase client's type inference requires this property to be present on table definitions.
        Relationships: [];
      };
      folders: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        // Fix: Relaxed Insert and Update types to be more flexible and avoid inference issues.
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        // FIX: Add empty Relationships array. The Supabase client's type inference requires this property to be present on table definitions.
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};


const supabaseUrl = "https://pyjqceghzywgznhxzakg.supabase.co";
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5anFjZWdoenl3Z3puaHh6YWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0ODE1MDMsImV4cCI6MjA3MzA1NzUwM30.OrMt01YVYPr-bgXgqx3Ny0Z7V38u-2fHRfJ3EIaLhH8";

// The client will be null if the environment variables are not set.
let supabase: SupabaseClient<Database> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
} else {
  // This is an expected state if the app is run without Supabase credentials.
  // The dataService will handle the null client gracefully.
  console.log("Supabase environment variables not set. Bookmarking features will be disabled.");
}

// Export the potentially null client.
export { supabase };