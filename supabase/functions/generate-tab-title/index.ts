declare const Deno: any;

import { GoogleGenAI } from "npm:@google/genai";

const apiKey = Deno.env.get("GEMINI_API_KEY");
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey });

interface HistoryItem {
  query: string;
  answer: string;
}

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
    const { history } = await req.json();

    if (!history || !Array.isArray(history) || history.length === 0) {
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: "History array with at least one item is required" }), {
        status: 400,
        headers,
      });
    }

    // Create a concise context from the history
    const conversationContext = history
        .map((item: HistoryItem) => `Q: ${item.query}`)
        .join('\n');

    const prompt = `Based on the following list of search queries from a research session, create a very short, concise title (2-4 words maximum). The title should capture the main theme of the research.\n\nQueries:\n${conversationContext}\n\nTitle:`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        stopSequences: ["\n"],
        temperature: 0.2,
      }
    });

    const title = response.text.replace(/["']/g, "").trim();

    if (!title) throw new Error("The AI returned an empty title.");

    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ title }), {
      headers,
    });

  } catch (error) {
    console.error("Error in generate-tab-title Edge Function:", error);
    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
});