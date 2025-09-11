import { auth } from './supabaseClient'; // Imports Firebase client (previously Supabase)
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

const functionsUrl = "https://us-central1-plexi-ai-search.cloudfunctions.net";


const getFunctionErrorMessage = (error: any, context: string): string => {
    console.error(`Firebase Function Error in ${context}:`, error);
     if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
            return `Error: You do not have permission to access the '${context}' function. You may need to be signed in.`;
        }
        if (error.message.includes('not-found')) {
            return `Error: The '${context}' function could not be found. Please ensure it has been deployed correctly.`;
        }
        if (error.message.includes('Failed to fetch')) {
            return `Error: Could not connect to the AI service. Please check your network connection and try again.`;
        }
    }
    return `An unexpected error occurred with the '${context}' function: ${error.message || 'Unknown error'}`;
}

const getAuthHeaders = async (): Promise<{ [key: string]: string }> => {
    const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
    };
    if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
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
        const headers = await getAuthHeaders();
        const functionUrl = `${functionsUrl}/generatePlexiResponse`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data: { query, focus, history } }),
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
                        const dataMatch = part.match(/data: (.*)/s); // Use 's' flag for multiline data

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
                                console.error("Failed to parse stream data chunk:", dataMatch[1], e);
                            }
                        }
                    }
                }
            }
        };

        await processStream();
        callbacks.onEnd();

    } catch (error) {
        callbacks.onError({ message: getFunctionErrorMessage(error, 'generatePlexiResponse') });
        callbacks.onEnd();
    }
};

const callFirebaseFunction = async <T>(functionName: string, payload: any): Promise<T> => {
    try {
        const headers = await getAuthHeaders();
        const functionUrl = `${functionsUrl}/${functionName}`;
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data: payload })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            throw new Error(errorBody.error?.message || errorBody.error || `Function returned status ${response.status}`);
        }

        const result = await response.json();
        return result.result as T;

    } catch(error) {
        throw new Error(getFunctionErrorMessage(error, functionName));
    }
}


export const generateSessionSummary = async (history: HistoryItem[]): Promise<string> => {
    if (history.length === 0) {
        return "This session is empty. Start a search to generate a summary.";
    }
    const data = await callFirebaseFunction<{ summary: string }>('generateSummary', { history });
    if (!data || typeof data.summary !== 'string' || !data.summary) {
        throw new Error("The AI returned an empty summary.");
    }
    return data.summary;
}

export const generateTabTitle = async (history: HistoryItem[]): Promise<string> => {
    if (history.length === 0) {
        return "New Tab";
    }
    const data = await callFirebaseFunction<{ title: string }>('generateTabTitle', { history });
    if (!data || typeof data.title !== 'string' || !data.title) {
        throw new Error("The AI returned an empty title.");
    }
    return data.title;
}

export const summarizePageContent = async (url: string): Promise<string> => {
    const data = await callFirebaseFunction<{ summary: string }>('summarizePage', { url });
    if (!data || typeof data.summary !== 'string' || !data.summary) {
        throw new Error("The AI returned an empty summary.");
    }
    return data.summary;
};