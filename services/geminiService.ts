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

// FIX: The Supabase functions URL is no longer publicly exposed on the client.
// We construct it manually from the project URL, as direct fetch is needed for streaming.
const functionsUrl = "https://pyjqceghzywgznhxzakg.supabase.co/functions/v1";


const getFunctionErrorMessage = (error: any, context: string): string => {
    console.error(`Supabase Function Error in ${context}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('permission denied')) {
            return `Error: You do not have permission to access the '${context}' function.`;
        }
        if (error.message.includes('Function not found')) {
            return `Error: The '${context}' function could not be found. Please ensure it has been deployed correctly.`;
        }
        if (error.message.includes('Failed to fetch')) { // Updated for native fetch
            return `Error: Could not connect to the AI service. Please check your network connection and try again.`;
        }
    }
    return `An unexpected error occurred with the '${context}' function: ${error.message || 'Unknown error'}`;
}

const getAuthHeaders = async (): Promise<{ [key: string]: string }> => {
    if (!supabase || !supabaseAnonKey) {
        throw new Error("Supabase client is not initialized.");
    }
    const { data: { session } } = await supabase.auth.getSession();
    const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
    };
    if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
};

export const createChat = (): null => {
    return null;
};

export const sendMessage = async (
    query: string, 
    focus: SearchFocus, 
    history: HistoryItem[], 
    callbacks: SendMessageCallbacks
): Promise<void> => {
    try {
        if (!supabase) throw new Error("Supabase client not initialized.");
        
        const headers = await getAuthHeaders();
        // FIX: Replaced protected property `supabase.functions.url` with a manually constructed URL.
        const functionUrl = `${functionsUrl}/generate-plexi-response`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, focus, history }),
        });

        if (!response.ok || !response.body) {
            const errorBody = await response.text();
            throw new Error(`Function returned status ${response.status}: ${errorBody}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';

                for (const part of parts) {
                    if (part.startsWith('event:')) {
                        const eventMatch = part.match(/event: (.*)/);
                        const dataMatch = part.match(/data: (.*)/);

                        if (eventMatch && dataMatch) {
                            const event = eventMatch[1];
                            try {
                                const data = JSON.parse(dataMatch[1]);
                                switch(event) {
                                    case 'chunk': callbacks.onChunk(data); break;
                                    case 'metadata': callbacks.onMetadata(data); break;
                                    case 'error': callbacks.onError(data); break;
                                }
                            } catch (e) {
                                console.error("Failed to parse stream data chunk:", dataMatch[1]);
                            }
                        }
                    }
                }
            }
        };

        await processStream();
        callbacks.onEnd();

    } catch (error) {
        callbacks.onError({ message: getFunctionErrorMessage(error, 'generate-plexi-response') });
        callbacks.onEnd();
    }
};

export const generateSessionSummary = async (history: HistoryItem[]): Promise<string> => {
    if (history.length === 0) {
        return "This session is empty. Start a search to generate a summary.";
    }
    try {
        if (!supabase) throw new Error("Supabase client not initialized.");
        const headers = await getAuthHeaders();
        // FIX: Replaced protected property `supabase.functions.url` with a manually constructed URL.
        const functionUrl = `${functionsUrl}/generate-summary`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ history }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            throw new Error(errorBody.error || `Function returned status ${response.status}`);
        }

        const data = await response.json();
        if (!data || typeof data.summary !== 'string' || !data.summary) {
             throw new Error("The AI returned an empty summary.");
        }
        return data.summary;

    } catch(error) {
        throw new Error(getFunctionErrorMessage(error, 'generate-summary'));
    }
}

export const generateTabTitle = async (history: HistoryItem[]): Promise<string> => {
    if (history.length === 0) {
        return "New Tab";
    }
     try {
        if (!supabase) throw new Error("Supabase client not initialized.");
        const headers = await getAuthHeaders();
        // FIX: Replaced protected property `supabase.functions.url` with a manually constructed URL.
        const functionUrl = `${functionsUrl}/generate-tab-title`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ history }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            throw new Error(errorBody.error || `Function returned status ${response.status}`);
        }

        const data = await response.json();
        if (!data || typeof data.title !== 'string' || !data.title) {
             throw new Error("The AI returned an empty title.");
        }

        return data.title;
    } catch(error) {
        throw new Error(getFunctionErrorMessage(error, 'generate-tab-title'));
    }
}

export const summarizePageContent = async (url: string): Promise<string> => {
    try {
        if (!supabase) throw new Error("Supabase client not initialized.");
        const headers = await getAuthHeaders();
        const functionUrl = `${functionsUrl}/summarize-page`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            throw new Error(errorBody.error || `Function returned status ${response.status}`);
        }

        const data = await response.json();
        if (!data || typeof data.summary !== 'string' || !data.summary) {
             throw new Error("The AI returned an empty summary.");
        }
        return data.summary;
    } catch(error) {
        throw new Error(getFunctionErrorMessage(error, 'summarize-page'));
    }
};