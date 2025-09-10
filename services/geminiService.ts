import { supabase, supabaseAnonKey } from './supabaseClient';
import { HistoryItem, Source, SearchFocus } from '../types';

interface SearchResult {
  answer: string;
  sources: Source[];
  followupQuestions: string[];
}

interface SendMessageCallbacks {
    onChunk: (chunk: { text: string }) => void;
    onMetadata: (metadata: { sources: Source[], followupQuestions: string[], finalAnswer: string }) => void;
    onError: (error: { message: string }) => void;
    onEnd: () => void;
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

export const sendMessage = async (
    query: string, 
    focus: SearchFocus, 
    history: HistoryItem[], 
    callbacks: SendMessageCallbacks
): Promise<void> => {
    if (!supabase || !supabaseAnonKey) {
        throw new Error("Supabase client is not initialized. Cannot call Edge Function.");
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error("User not authenticated.");
    }

    try {
        // FIX: Replaced manual `fetch` with `supabase.functions.invoke` which supports streaming
        // and correctly handles authentication and function URL resolution, fixing the protected property access error.
        // FIX: `responseType: 'stream'` can cause a type error if the Supabase client's types are outdated. Casting to `any` bypasses the check.
        const { data: responseBody, error: invokeError } = await supabase.functions.invoke('generate-plexi-response', {
            body: { query, focus, history },
            responseType: 'stream',
        } as any);
        
        if (invokeError) {
            throw invokeError;
        }

        if (!responseBody) {
            throw new Error("Response body is empty.");
        }

        const reader = responseBody.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';

                for (const part of parts) {
                    if (part.startsWith('event:')) {
                        const eventMatch = part.match(/event: (.*)/);
                        const dataMatch = part.match(/data: (.*)/);

                        if (eventMatch && dataMatch) {
                            const event = eventMatch[1];
                            const data = JSON.parse(dataMatch[1]);

                            switch(event) {
                                case 'chunk':
                                    callbacks.onChunk(data);
                                    break;
                                case 'metadata':
                                    callbacks.onMetadata(data);
                                    break;
                                case 'error':
                                    callbacks.onError(data);
                                    break;
                            }
                        }
                    }
                }
            }
        };

        await processStream();
        callbacks.onEnd();

    } catch (error) {
        console.error("Error calling edge function:", error);
        callbacks.onError({ message: getFunctionErrorMessage(error, 'generate-plexi-response') });
        callbacks.onEnd();
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