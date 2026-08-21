"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_MAX_ATTEMPTS = 3;

export const generateInterviewInsights = action({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    // 1. Fetch interview details
    const interview = await ctx.runQuery(internal.interviews.getInterviewInternal, { id: args.interviewId });
    if (!interview) throw new Error("Interview not found");

    // 2. Fetch comments for this interview
    const comments = await ctx.runQuery(internal.comments.getCommentsInternal, { interviewId: args.interviewId });
    
    if (comments.length === 0) {
      return "No comments available to generate insights.";
    }

    // 3. Prepare the prompt for Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

    const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const commentsText = comments.map(c => `- Rating: ${c.rating}/5. Notes: ${c.content}`).join("\n");
    
    const promptText = `
Role: Senior Technical Recruiter.
Goal: Summarize the interview feedback for candidate ${interview.candidateName || 'Unknown'} and provide a final hiring recommendation.

Interview Context:
- Role/Title: ${interview.title}
- Description: ${interview.description || "N/A"}

Interviewer Feedback:
${commentsText}

Please provide a concise, structured summary in Markdown format with the following sections:
### Executive Summary
### Key Strengths Demonstrated
### Areas of Concern
### Final Recommendation (Strong Hire, Hire, Weak Hire, or No Hire)
`;

    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: {
        maxOutputTokens: 1000,
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
          
          // Save the AI summary as a comment
          await ctx.runMutation(internal.comments.addInternalComment, {
            interviewId: args.interviewId,
            content: text.trim(),
            rating: 0, // 0 means AI
            interviewerId: "AI_SUPER_RECRUITER",
          });
          
          return "Insights generated successfully.";
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
