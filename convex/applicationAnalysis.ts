"use node";

import { action, internalAction } from "./_generated/server";
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

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_FALLBACK_MODELS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_DELAY_MS = 1200;

class GeminiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeminiRequestError";
    this.status = status;
  }
}

const ANALYSIS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: {
      type: "NUMBER",
      description: "A numeric match score from 0 to 100.",
    },
    recommendation: {
      type: "STRING",
      enum: ["strong_match", "maybe", "weak_match"],
    },
    matchedSkills: { type: "ARRAY", items: { type: "STRING" } },
    missingSkills: { type: "ARRAY", items: { type: "STRING" } },
    experienceSummary: { type: "STRING" },
    strengths: { type: "ARRAY", items: { type: "STRING" } },
    concerns: { type: "ARRAY", items: { type: "STRING" } },
    decisionReason: { type: "STRING" },
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

export const rerunApplicationAnalysis = action({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    await assertInterviewerForAnalysis(ctx);

    const application = await ctx.runQuery(internal.applications.getApplicationInternal, {
      id: args.id,
    });

    if (!application) throw new Error("Application not found");

    const jobRequirements = await findJobRequirementsForApplication(ctx, application);
    if (!jobRequirements) {
      throw new Error("No job requirements found for this application");
    }

    try {
      return await runAiAnalysis(ctx, args.id, jobRequirements);
    } catch (error) {
      console.error("Rerun AI analysis error:", error);
      await ctx.runMutation(internal.applications.markAnalysisFailed, {
        id: args.id,
        message: error instanceof Error ? error.message : "AI analysis failed",
      });
      throw error;
    }
  },
});

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

  // Fallback: construct job requirements dynamically from application position
  return {
    jobId: application.jobId || slugify(application.position) || "general",
    title: application.position || "General Candidate Evaluation",
    description: `Evaluate candidate suitability for the role of ${application.position}. Assess technical expertise, relevant past experience, key strengths, and missing skills.`,
    requiredSkills: ["Core Technical Skills", "Problem Solving", "Relevant Experience"],
    niceToHaveSkills: ["Teamwork", "Communication"],
    languages: ["English"],
  };
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
  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const mimeType = application.cvFileType || "application/pdf";

  const { payload, model: analysisModel } = await requestGeminiAnalysis({
    apiKey,
    application,
    base64File,
    mimeType,
    model,
    requirements,
  });
  const analysis = normalizeAnalysisResult(parseGeminiAnalysisJson(extractGeminiOutputText(payload)));

  await ctx.runMutation(internal.applications.saveAnalysisResult, {
    applicationId,
    jobId: requirements.jobId,
    ...analysis,
    model: analysisModel,
  });

  return analysis;
}

async function assertInterviewerForAnalysis(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  // Previously required interviewer role; now any authenticated user can run analysis.
}

async function requestGeminiAnalysis({
  apiKey,
  application,
  base64File,
  mimeType,
  model,
  requirements,
}: {
  apiKey: string;
  application: Doc<"applications">;
  base64File: string;
  mimeType: string;
  model: string;
  requirements: JobRequirements;
}) {
  const modelCandidates = getGeminiModelCandidates(model);
  const variants = modelCandidates.flatMap((candidateModel) => [
    { model: candidateModel, useResponseSchema: true },
    { model: candidateModel, useResponseSchema: false },
  ]);
  let lastError = "Gemini analysis failed";

  for (const variant of variants) {
    try {
      const payload = await requestGeminiVariant({
        apiKey,
        application,
        base64File,
        mimeType,
        model: variant.model,
        requirements,
        useResponseSchema: variant.useResponseSchema,
      });

      return {
        payload,
        model: variant.useResponseSchema ? variant.model : `${variant.model} (json mode)`,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Gemini request failed";

      if (!shouldTryNextGeminiVariant(error)) {
        throw new Error(lastError);
      }

      console.warn(
        `Gemini analysis variant failed for ${variant.model}${
          variant.useResponseSchema ? " with schema" : " without schema"
        }: ${lastError}`
      );
    }
  }

  throw new Error(
    `Gemini analysis failed after trying fallback models. Last error: ${lastError}`
  );
}

async function requestGeminiVariant({
  apiKey,
  application,
  base64File,
  mimeType,
  model,
  requirements,
  useResponseSchema,
}: {
  apiKey: string;
  application: Doc<"applications">;
  base64File: string;
  mimeType: string;
  model: string;
  requirements: JobRequirements;
  useResponseSchema: boolean;
}) {
  const body = buildGeminiRequestBody({
    application,
    base64File,
    mimeType,
    requirements,
    useResponseSchema,
  });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let lastError = "Gemini analysis failed";

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
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
        return await response.json();
      }

      const errorText = await response.text();
      lastError = `Gemini analysis failed (${response.status}): ${formatGeminiError(errorText)}`;

      if (!isRetryableGeminiStatus(response.status) || attempt === GEMINI_MAX_ATTEMPTS) {
        throw new GeminiRequestError(lastError, response.status);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Gemini request failed";

      if (attempt === GEMINI_MAX_ATTEMPTS || !isRetryableGeminiError(error)) {
        if (error instanceof GeminiRequestError) throw error;
        throw new GeminiRequestError(lastError);
      }
    }

    await sleep(GEMINI_RETRY_BASE_DELAY_MS * attempt);
  }

  throw new GeminiRequestError(lastError);
}

function buildGeminiRequestBody({
  application,
  base64File,
  mimeType,
  requirements,
  useResponseSchema,
}: {
  application: Doc<"applications">;
  base64File: string;
  mimeType: string;
  requirements: JobRequirements;
  useResponseSchema: boolean;
}) {
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
  };

  if (useResponseSchema) {
    generationConfig.responseSchema = ANALYSIS_RESPONSE_SCHEMA;
  }

  return JSON.stringify({
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
    generationConfig,
  });
}

function isRetryableGeminiStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isRetryableGeminiError(error: unknown) {
  if (error instanceof GeminiRequestError) {
    return !error.status || isRetryableGeminiStatus(error.status);
  }

  if (!(error instanceof Error)) return true;
  return !error.message.startsWith("Gemini analysis failed (4");
}

function shouldTryNextGeminiVariant(error: unknown) {
  if (!(error instanceof GeminiRequestError)) return true;
  if (!error.status) return true;
  return error.status !== 401 && error.status !== 403;
}

function getGeminiModelCandidates(configuredModel: string) {
  return [configuredModel || DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]
    .map((model) => model.trim())
    .filter((model, index, models) => model && models.indexOf(model) === index);
}

function formatGeminiError(errorText: string) {
  try {
    const parsed = JSON.parse(errorText);
    const message = parsed.error?.message ?? errorText;
    const status = parsed.error?.status ? ` (${parsed.error.status})` : "";
    return `${message}${status}`;
  } catch {
    return errorText || "Unknown Gemini error";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const parts =
    payload.candidates
      ?.flatMap((candidate: any) => candidate.content?.parts ?? [])
      ?.filter((part: any) => typeof part.text === "string" && part.text.trim().length > 0)
      ?.map((part: any) => part.text) ?? [];

  if (!parts.length) throw new Error("Gemini returned no analysis text");
  return parts.join("\n").trim();
}

function parseGeminiAnalysisJson(text: string) {
  let cleaned = text.trim();

  // Strip thinking tags if any (e.g. <think>...</think>)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2. Extract content inside ```json ... ``` code fences
  const codeFenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeFenceMatch && codeFenceMatch[1]) {
    try {
      return JSON.parse(codeFenceMatch[1].trim());
    } catch {}
  }

  // 3. Find JSON object enclosing braces
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidateStr = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(candidateStr);
    } catch {}

    // 4. Try fixing trailing commas or control characters
    try {
      const sanitized = candidateStr
        .replace(/,\s*([\}\]])/g, "$1")
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
      return JSON.parse(sanitized);
    } catch {}
  }

  // 5. Fallback Regex Extraction to extract field arrays & strings
  const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+)/i) || cleaned.match(/score[:\s]+(\d+)/i);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 75;

  const recMatch = cleaned.match(/"recommendation"\s*:\s*"([^"]+)"/i);
  const recommendation = recMatch
    ? recMatch[1]
    : score >= 80
      ? "strong_match"
      : score >= 50
        ? "maybe"
        : "weak_match";

  const extractArray = (key: string) => {
    const m = cleaned.match(new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]?`, "i"));
    if (!m || !m[1]) return [];
    return m[1]
      .split(",")
      .map((s) => s.replace(/["'\[\]]/g, "").trim())
      .filter(Boolean);
  };

  const extractString = (key: string) => {
    const m = cleaned.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "i"));
    return m ? m[1].trim() : "";
  };

  const decisionReason = extractString("decisionReason") || "CV analysis completed.";
  const experienceSummary = extractString("experienceSummary") || decisionReason;

  return {
    score,
    recommendation,
    matchedSkills: extractArray("matchedSkills"),
    missingSkills: extractArray("missingSkills"),
    experienceSummary,
    strengths: extractArray("strengths"),
    concerns: extractArray("concerns"),
    decisionReason,
  };
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
