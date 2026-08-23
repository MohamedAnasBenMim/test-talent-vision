"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
];

function extractJsonText(rawText: string): string {
  const trimmed = rawText.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

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

    const customModel = process.env.GEMINI_MODEL;
    const modelsToTry = customModel ? [customModel, ...CANDIDATE_MODELS] : CANDIDATE_MODELS;

    const promptText = `
Role: Expert IT Recruiter and Technical Evaluator.
Goal: Generate a comprehensive, professional, and bias-free job description based on the provided title and optional hints. Additionally, generate:
1) Exactly 5 EASY multiple-choice (QCM) assessment questions tailored to the core skills of this role. All questions MUST be EASY and beginner-friendly for candidates in this domain (Data, AI, Software, Cloud, Cyber, etc.).
2) Exactly 1 EASY technical coding problem tailored to this role. The problem MUST be EASY, clear, and straightforward.

Title: ${args.title}
Additional Context/Hints: ${args.prompt || "None provided"}

Return ONLY valid JSON. Do not wrap it in markdown or code fences.

Required JSON shape:
{
  "description": "Full professional job description formatted in clean Markdown. Start with '## Job Overview' describing the role. Next section '## Key Responsibilities' as a bulleted list (- item). Next section '## Qualifications' as a bulleted list (- item). IMPORTANT: You MUST highlight all key technical skills, languages, tools, frameworks, and qualifications in BOLD text using double asterisks (e.g., **Python**, **Django**, **RESTful APIs**, **SQL**, **Git**).",
  "requiredSkills": "Comma separated string of 3-5 core required skills",
  "niceToHaveSkills": "Comma separated string of 2-4 nice to have skills",
  "minimumExperience": "E.g., 1+ years",
  "languages": "Comma separated string of required languages",
  "education": "E.g., Bachelor's in Computer Science or equivalent",
  "qcmQuestions": [
    {
      "id": "q1",
      "prompt": "Easy concept question about core skill?",
      "options": [
        { "id": "a", "label": "Correct Option" },
        { "id": "b", "label": "Incorrect Option B" },
        { "id": "c", "label": "Incorrect Option C" },
        { "id": "d", "label": "Incorrect Option D" }
      ],
      "correctOptionId": "a"
    }
  ],
  "codingQuestion": {
    "id": "coding-1",
    "title": "Easy Technical Problem Title",
    "description": "Clear description of an EASY coding task relevant to the role.",
    "examples": [
      {
        "input": "No input or simple input",
        "output": "Expected output string",
        "explanation": "Brief explanation"
      }
    ],
    "starterCode": {
      "javascript": "// Write your code here",
      "python": "# Write your code here",
      "java": "class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}",
      "cpp": "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}"
    },
    "constraints": ["Keep output format exact."]
  }
}
`;

    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: {
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    });

    let lastErrorMsg = "";

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body,
        });

        if (!response.ok) {
          const errText = await response.text();
          lastErrorMsg = `${model}: ${response.status} ${errText}`;
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;

        const jsonString = extractJsonText(text);
        try {
          return JSON.parse(jsonString);
        } catch (parseErr) {
          lastErrorMsg = `JSON parse error on ${model}`;
        }
      } catch (err) {
        lastErrorMsg = err instanceof Error ? err.message : String(err);
      }
    }

    throw new Error(`Failed to generate job description: ${lastErrorMsg || "All Gemini model candidates failed"}`);
  },
});
