/// <reference types="https://deno.land/x/deno/types/deploy.d.ts" />

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
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        } 
    });
  }

  try {
    const { history } = await req.json();

    if (!history || !Array.isArray(history)) {
      return new Response(JSON.stringify({ error: "History array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const conversationContext = history.map((item: HistoryItem) => `User Query: "${item.query}"\nAI Answer: "${item.answer.substring(0, 200)}..."`).join('\n\n');
    const prompt = `Based on the following conversation history, please provide a concise, one-paragraph summary of the key topics and findings. The user is conducting a research session, so focus on the main themes discovered.\n\nConversation:\n${conversationContext}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert research assistant, skilled at summarizing complex information into a brief, insightful overview."
      }
    });

    const summary = response.text;
    if (!summary) throw new Error("The AI returned an empty summary.");

    return new Response(JSON.stringify({ summary }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });

  } catch (error) {
    console.error("Error in Summary Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});