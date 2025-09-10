import { supabase } from './supabaseClient';
import { Bookmark, Folder, HistoryItem } from '../types';

const throwSupabaseError = (error: any, context: string) => {
    console.error(`Supabase error in ${context}:`, error);
    throw new Error(`Failed to ${context}. Please check your connection or try again.`);
}

const checkSupabaseConfig = () => {
    if (!supabase) {
        throw new Error(`This feature requires a Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.`);
    }
};

/**
 * Fetches all folders and bookmarks for the currently authenticated user.
 * NOTE: This relies on Supabase Auth to determine the user.
 * If no user is logged in, it will return empty arrays if RLS is enabled.
 */
export const fetchData = async (): Promise<{ bookmarks: Bookmark[], folders: Folder[] }> => {
    if (!supabase) {
        // Fail gracefully on load if Supabase isn't configured.
        return { bookmarks: [], folders: [] };
    }

    // Fetch folders and bookmarks in parallel
    const [foldersResponse, bookmarksResponse] = await Promise.all([
        supabase.from('folders').select('*').order('created_at', { ascending: false }),
        supabase.from('bookmarks').select('*').order('created_at', { ascending: false })
    ]);

    if (foldersResponse.error) throwSupabaseError(foldersResponse.error, 'fetch folders');
    if (bookmarksResponse.error) throwSupabaseError(bookmarksResponse.error, 'fetch bookmarks');
    
    return {
        folders: foldersResponse.data || [],
        bookmarks: bookmarksResponse.data || [],
    };
};

/**
 * Adds a new folder.
 */
export const addFolder = async (name: string): Promise<Folder> => {
    checkSupabaseConfig();
    const { data, error } = await supabase!
        .from('folders')
        .insert({ name })
        .select()
        .single();
    
    if (error) throwSupabaseError(error, 'add folder');
    if (!data) throw new Error('Failed to create folder, no data returned.');
    
    return data;
};

/**
 * Deletes a folder.
 */
export const deleteFolder = async (folderId: string): Promise<void> => {
    checkSupabaseConfig();
    const { error } = await supabase!.from('folders').delete().eq('id', folderId);
    if (error) throwSupabaseError(error, 'delete folder');
};

/**
 * Adds a new bookmark.
 */
export const addBookmark = async (historyItem: HistoryItem, folderId: string | null): Promise<Bookmark> => {
    checkSupabaseConfig();
    const { data, error } = await supabase!
        .from('bookmarks')
        .insert({ history_item: historyItem, folder_id: folderId })
        .select()
        .single();
        
    if (error) throwSupabaseError(error, 'add bookmark');
    if (!data) throw new Error('Failed to create bookmark, no data returned.');

    return data;
};

/**
 * Deletes a bookmark.
 */
export const deleteBookmark = async (bookmarkId: string): Promise<void> => {
    checkSupabaseConfig();
    const { error } = await supabase!.from('bookmarks').delete().eq('id', bookmarkId);
    if (error) throwSupabaseError(error, 'delete bookmark');
};

/**
 * Moves a bookmark to a different folder (or un-categorizes it).
 */
export const moveBookmarkToFolder = async (bookmarkId: string, folderId: string | null): Promise<void> => {
    checkSupabaseConfig();
    const { error } = await supabase!
        .from('bookmarks')
        .update({ folder_id: folderId })
        .eq('id', bookmarkId);
        
    if (error) throwSupabaseError(error, 'move bookmark');
};