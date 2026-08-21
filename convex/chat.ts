"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_MAX_ATTEMPTS = 3;

export const sendMessage = action({
  args: { 
    jobId: v.optional(v.string()),
    message: v.string(),
    history: v.array(v.object({ role: v.string(), content: v.string() }))
  },
  handler: async (ctx, args) => {
    let jobContext = "You are Vity AI, a helpful recruitment assistant for BECARTH.AI Consulting. You help candidates with general questions about the application process.";

    if (args.jobId) {
      const job = await ctx.runQuery(internal.applications.getJobByJobIdInternal, { jobId: args.jobId });
      if (job) {
        jobContext = `You are Vity AI, a helpful recruitment assistant for BECARTH.AI Consulting.
You are currently helping a candidate who is looking at the following job posting:
Title: ${job.title}
Location: ${job.location || 'Not specified'}
Contract Type: ${job.contractType || 'Not specified'}
Required Skills: ${job.requiredSkills.join(", ")}
Description: ${job.description}

Answer the candidate's questions about this role or the company. Be friendly, concise, and helpful. Do not promise them a job or an interview.`;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

    const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // Convert history to Gemini format
    const contents = args.history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));
    
    // Add current message
    contents.push({
      role: "user",
      parts: [{ text: args.message }]
    });

    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: jobContext }] },
      contents,
      generationConfig: {
        maxOutputTokens: 300,
      },
    });

    for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body,
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error("No text returned from Gemini");
          
          return text.trim();
        }

        if (attempt === GEMINI_MAX_ATTEMPTS) {
          throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
        }
      } catch (error) {
        if (attempt === GEMINI_MAX_ATTEMPTS) throw error;
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  },
});
