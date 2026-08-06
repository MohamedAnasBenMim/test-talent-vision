"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

type JobRequirements = {
  jobId: string;
  title: string;
  description: string;
  location?: string;
  contractType?: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minimumExperience?: string;
  languages: string[];
  education?: string;
  status?: "draft" | "published" | "closed";
};

type CvAnalysisResult = {
  score: number;
  recommendation: "strong_match" | "maybe" | "weak_match";
  matchedSkills: string[];
  missingSkills: string[];
  experienceSummary: string;
  strengths: string[];
  concerns: string[];
  decisionReason: string;
};

const ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    score: {
      type: "number",
      description: "A numeric match score from 0 to 100.",
    },
    recommendation: {
      type: "string",
      enum: ["strong_match", "maybe", "weak_match"],
    },
    matchedSkills: { type: "array", items: { type: "string" } },
    missingSkills: { type: "array", items: { type: "string" } },
    experienceSummary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    concerns: { type: "array", items: { type: "string" } },
    decisionReason: { type: "string" },
  },
  required: [
    "score",
    "recommendation",
    "matchedSkills",
    "missingSkills",
    "experienceSummary",
    "strengths",
    "concerns",
    "decisionReason",
  ],
};

export const analyzeApplicationAfterSubmit = internalAction({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    const application = await ctx.runQuery(internal.applications.getApplicationInternal, {
      id: args.id,
    });

    if (!application) return;

    const jobRequirements = await findJobRequirementsForApplication(ctx, application);
    if (!jobRequirements) return;

    try {
      await runAiAnalysis(ctx, args.id, jobRequirements);
    } catch (error) {
      console.error(error);
      await ctx.runMutation(internal.applications.markAnalysisFailed, {
        id: args.id,
        message: error instanceof Error ? error.message : "AI analysis failed",
      });
    }
  },
});

async function findJobRequirementsForApplication(
  ctx: any,
  application: Doc<"applications">
): Promise<JobRequirements | null> {
  const jobIds = [
    application.jobId,
    slugify(application.position),
    application.position.trim().toLowerCase(),
  ].filter(Boolean) as string[];

  for (const jobId of jobIds) {
    const job = await ctx.runQuery(internal.applications.getJobByJobIdInternal, { jobId });
    if (job) return job;
  }

  return null;
}

async function runAiAnalysis(
  ctx: any,
  applicationId: Id<"applications">,
  jobRequirements?: JobRequirements
): Promise<CvAnalysisResult> {
  const application = await ctx.runQuery(internal.applications.getApplicationInternal, {
    id: applicationId,
  });

  if (!application) throw new Error("Application not found");

  const requirements =
    jobRequirements ?? (await findJobRequirementsForApplication(ctx, application));

  if (!requirements) {
    throw new Error("No job requirements found for this application");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in Convex environment");
  }

  await ctx.runMutation(internal.applications.markAnalysisStarted, { id: applicationId });

  const cvBlob = await ctx.storage.get(application.cvStorageId);
  if (!cvBlob) throw new Error("CV file was not found in storage");

  const fileBytes = Buffer.from(await cvBlob.arrayBuffer());
  const base64File = fileBytes.toString("base64");
  const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  const mimeType = application.cvFileType || "application/pdf";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildAnalysisPrompt(application, requirements),
              },
              {
                inlineData: {
                  mimeType,
                  data: base64File,
                },
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1400,
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_RESPONSE_SCHEMA,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini analysis failed: ${errorText}`);
  }

  const payload = await response.json();
  const analysis = normalizeAnalysisResult(parseGeminiAnalysisJson(extractGeminiOutputText(payload)));

  await ctx.runMutation(internal.applications.saveAnalysisResult, {
    applicationId,
    jobId: requirements.jobId,
    ...analysis,
    model,
  });

  return analysis;
}

function buildAnalysisPrompt(application: Doc<"applications">, job: JobRequirements) {
  return `Role: Recruiting CV screening assistant for BECARTH.AI Consulting.

Goal: Analyze the attached CV against the job requirements and return a recruiter-facing ranking.

Important constraints:
- Do not reject the candidate. Only rank and explain; a human recruiter makes the final decision.
- Use only evidence from the CV and the job requirements.
- If evidence is missing or unclear, list it as a concern instead of guessing.
- Score 80-100 as strong_match, 50-79 as maybe, and 0-49 as weak_match.
- Keep the decisionReason concise and professional.

Candidate:
- Name: ${application.fullName}
- Email: ${application.email}
- Applied position: ${application.position}

Job requirements:
- Job ID: ${job.jobId}
- Title: ${job.title}
- Location: ${job.location || "Not specified"}
- Contract type: ${job.contractType || "Not specified"}
- Description: ${job.description}
- Required skills: ${job.requiredSkills.join(", ") || "Not specified"}
- Nice-to-have skills: ${job.niceToHaveSkills.join(", ") || "Not specified"}
- Minimum experience: ${job.minimumExperience || "Not specified"}
- Languages: ${job.languages.join(", ") || "Not specified"}
- Education/certifications: ${job.education || "Not specified"}

Return only valid JSON. Do not wrap it in markdown or code fences.

Required JSON shape:
{
  "score": 0,
  "recommendation": "strong_match" | "maybe" | "weak_match",
  "matchedSkills": ["string"],
  "missingSkills": ["string"],
  "experienceSummary": "string",
  "strengths": ["string"],
  "concerns": ["string"],
  "decisionReason": "string"
}`;
}

function extractGeminiOutputText(payload: any) {
  const texts =
    payload.candidates
      ?.flatMap((candidate: any) => candidate.content?.parts ?? [])
      ?.filter((part: any) => typeof part.text === "string")
      ?.map((part: any) => part.text) ?? [];

  const text = texts.join("\n").trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  if (!text) throw new Error("Gemini returned no analysis text");
  return text;
}

function parseGeminiAnalysisJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Gemini returned invalid analysis JSON");
    return JSON.parse(text.slice(start, end + 1));
  }
}

function normalizeAnalysisResult(value: any): CvAnalysisResult {
  const score = Math.max(0, Math.min(100, Number(value.score) || 0));
  const recommendation =
    value.recommendation === "strong_match" ||
    value.recommendation === "maybe" ||
    value.recommendation === "weak_match"
      ? value.recommendation
      : score >= 80
        ? "strong_match"
        : score >= 50
          ? "maybe"
          : "weak_match";

  return {
    score,
    recommendation,
    matchedSkills: normalizeStringArray(value.matchedSkills),
    missingSkills: normalizeStringArray(value.missingSkills),
    experienceSummary: String(value.experienceSummary || "No experience summary provided."),
    strengths: normalizeStringArray(value.strengths),
    concerns: normalizeStringArray(value.concerns),
    decisionReason: String(value.decisionReason || "No decision reason provided."),
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean).slice(0, 12);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
