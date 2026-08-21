"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_MAX_ATTEMPTS = 3;

export const generateJobDescription = action({
  args: { 
    title: v.string(),
    prompt: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in Convex environment");
    }

    const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const promptText = `
Role: Expert IT Recruiter and copywriter.
Goal: Generate a comprehensive, professional, and bias-free job description based on the provided title and optional hints.

Title: ${args.title}
Additional Context/Hints: ${args.prompt || "None provided"}

Return ONLY valid JSON. Do not wrap it in markdown or code fences.

Required JSON shape:
{
  "description": "Full professional job description string (markdown supported internally)",
  "requiredSkills": "Comma separated string of 3-5 core required skills",
  "niceToHaveSkills": "Comma separated string of 2-4 nice to have skills",
  "minimumExperience": "E.g., 3+ years",
  "languages": "Comma separated string of required languages",
  "education": "E.g., Bachelor's in Computer Science or equivalent"
}
`;

    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: {
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
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
          
          const cleanText = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
          return JSON.parse(cleanText);
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
