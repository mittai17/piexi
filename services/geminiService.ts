import { supabase } from './supabaseClient';
import { HistoryItem, Source, SearchFocus } from '../types';

interface SearchResult {
  answer: string;
  sources: Source[];
  followupQuestions: string[];
}

const getFunctionErrorMessage = (error: any, context: string): string => {
    console.error(`Supabase Function Error in ${context}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('permission denied')) {
            return `Error: You do not have permission to access the '${context}' function.`;
        }
        if (error.message.includes('Function not found')) {
            return `Error: The '${context}' function could not be found. Please ensure it has been deployed correctly.`;
        }
    }
    return `An unexpected error occurred with the '${context}' function. Please try again.`;
}

// No longer creates a chat object, as conversation history is managed in App.tsx
// and sent with each request to the backend function.
export const createChat = (): null => {
    return null;
};

export const sendMessage = async (query: string, focus: SearchFocus, history: HistoryItem[]): Promise<SearchResult> => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized. Cannot call Edge Function.");
    }
    
    try {
        const { data, error } = await supabase.functions.invoke('generate-plexi-response', {
            body: { query, focus, history },
        });

        if (error) {
            throw error;
        }

        // The function is expected to return data in the SearchResult format.
        return data as SearchResult;

    } catch (error) {
        throw new Error(getFunctionErrorMessage(error, 'generate-plexi-response'));
    }
};

export const generateSessionSummary = async (history: HistoryItem[]): Promise<string> => {
    if (history.length === 0) {
        return "This session is empty. Start a search to generate a summary.";
    }
    if (!supabase) {
        throw new Error("Supabase client is not initialized. Cannot call Edge Function.");
    }

    try {
         const { data, error } = await supabase.functions.invoke('generate-summary', {
            body: { history },
        });

        if (error) {
            throw error;
        }
        
        if (!data || typeof data.summary !== 'string' || !data.summary) {
             throw new Error("The AI returned an empty summary.");
        }

        return data.summary;
    } catch(error) {
        throw new Error(getFunctionErrorMessage(error, 'generate-summary'));
    }
}
