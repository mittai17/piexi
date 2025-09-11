declare const Deno: any;

import { GoogleGenAI, Content } from "npm:@google/genai";

// Ensure you have set the GEMINI_API_KEY in your Supabase project's secrets
const apiKey = Deno.env.get("GEMINI_API_KEY");
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey });

// Define interfaces for type safety
interface Source {
  uri: string;
  title: string;
}

interface HistoryItem {
  query: string;
  answer: string;
}

type SearchFocus = 'all' | 'academic' | 'writing' | 'youtube' | 'reddit';

const getFocusPromptPrefix = (focus: SearchFocus): string => {
    switch (focus) {
      case 'academic': return 'Search for academic papers and scholarly articles to answer the following: ';
      case 'writing': return 'Act as an expert writing assistant. Rephrase, summarize, or expand on the following text: ';
      case 'youtube': return 'Search YouTube and summarize the most relevant video(s) for the query: ';
      case 'reddit': return 'Search Reddit for discussions and opinions on the following topic: ';
      default: return '';
    }
};

const buildChatHistory = (history: HistoryItem[]): Content[] => {
    const chatHistory: Content[] = [];
    for (const item of history) {
        // Add the user's query
        chatHistory.push({
            role: "user",
            parts: [{ text: item.query }]
        });
        // Add the model's response
        chatHistory.push({
            role: "model",
            parts: [{ text: item.answer }]
        });
    }
    return chatHistory;
};

Deno.serve(async (req) => {
  // Robust CORS handling using the Headers API
  const origin = req.headers.get("Origin");
  const headers = new Headers();
  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const { query, focus, history } = await req.json();

    if (!query) {
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers,
      });
    }

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [
            ...buildChatHistory(history || []),
            { role: 'user', parts: [{ text: `${getFocusPromptPrefix(focus || 'all')}${query}` }] }
        ],
        config: {
            tools: [{ googleSearch: {} }],
            systemInstruction: "You are Plexi, an AI search engine powered by the Google Search tool. Your primary function is to use Google Search to find the most relevant and up-to-date information to answer user queries. Provide comprehensive, clear, and well-structured answers based on the search results. Always cite your sources from the search results. Use markdown for formatting. After the main answer, include a <followup_questions> section containing 3-4 relevant follow-up questions a user might ask. Each question should be on a new line."
        },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendJSON = (event, data) => {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          for await (const chunk of responseStream.stream) {
            const text = chunk.text;
            if (text) {
              sendJSON('chunk', { text });
            }
          }
          
          const aggregatedResponse = await responseStream.response;
          const fullText = aggregatedResponse.text;

          const followupRegex = /<followup_questions>([\s\S]*?)<\/followup_questions>/;
          const followupMatch = fullText.match(followupRegex);
          const followupQuestions = followupMatch
            ? followupMatch[1].trim().split('\n').map(q => q.trim().replace(/^- /, '')).filter(Boolean)
            : [];
          
          const answer = fullText.replace(followupRegex, '').trim();

          const rawSources = aggregatedResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const sources: Source[] = rawSources
            .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
            .map(chunk => ({
              uri: chunk.web.uri,
              title: chunk.web.title,
            }))
            .filter((source, index, self) => index === self.findIndex((s) => s.uri === source.uri));

          sendJSON('metadata', { sources, followupQuestions, finalAnswer: answer });

        } catch (e) {
            console.error("Error during stream processing:", e);
            sendJSON('error', { message: e.message });
        } finally {
            controller.close();
        }
      },
    });
      
    headers.set("Content-Type", "text/event-stream");
    headers.set("Cache-Control", "no-cache");
    headers.set("Connection", "keep-alive");
      
    return new Response(stream, { headers });

  } catch (error) {
    console.error("Error in Edge Function:", error);
    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
});