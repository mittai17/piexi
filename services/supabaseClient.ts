import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Bookmark, Folder, HistoryItem } from '../types';

// Define the database type for type safety with Supabase client
// We are only typing the tables we interact with in this app.
export type Database = {
  public: {
    Tables: {
      bookmarks: {
        Row: Bookmark;
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
      };
      folders: {
        Row: Folder;
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


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

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