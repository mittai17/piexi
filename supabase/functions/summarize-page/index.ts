declare const Deno: any;

import { GoogleGenAI } from "npm:@google/genai";

const apiKey = Deno.env.get("GEMINI_API_KEY");
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey });

// Basic function to strip HTML tags and extra whitespace
const stripHtml = (html: string): string => {
  return html
    .replace(/<style([\s\S]*?)<\/style>/gi, '')   // Remove style tags
    .replace(/<script([\s\S]*?)<\/script>/gi, '')  // Remove script tags
    .replace(/<[^>]*>/g, ' ')                      // Remove all other tags
    .replace(/\s\s+/g, ' ')                       // Replace multiple spaces with a single space
    .trim();
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const headers = new Headers();
  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers,
      });
    }

    // Fetch the content of the webpage
    const pageResponse = await fetch(url);
    if (!pageResponse.ok) {
        throw new Error(`Failed to fetch page content. Status: ${pageResponse.status}`);
    }
    const htmlContent = await pageResponse.text();
    const textContent = stripHtml(htmlContent);
    const truncatedContent = textContent.substring(0, 10000); // Limit content size

    const prompt = `Please provide a concise, one-paragraph summary of the following webpage content:\n\n---\n${truncatedContent}\n---\n\nSummary:`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    const summary = response.text;
    if (!summary) throw new Error("The AI returned an empty summary.");

    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ summary }), {
      headers,
    });

  } catch (error) {
    console.error("Error in Summarize Page Function:", error);
    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
});