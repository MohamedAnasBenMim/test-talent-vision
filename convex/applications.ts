import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const APPLICATION_STATUSES = v.union(
  v.literal("submitted"),
  v.literal("cv_analyzing"),
  v.literal("cv_review_required"),
  v.literal("cv_rejected"),
  v.literal("technical_invited"),
  v.literal("technical_passed"),
  v.literal("technical_failed"),
  v.literal("saved_to_talent_pool")
);

const AI_RECOMMENDATIONS = v.union(
  v.literal("strong_match"),
  v.literal("maybe"),
  v.literal("weak_match")
);

const AUTO_TECHNICAL_INVITE_EMAIL = "medanasbenmim123@gmail.com";

const JOB_REQUIREMENTS = {
  jobId: v.string(),
  title: v.string(),
  description: v.string(),
  location: v.optional(v.string()),
  contractType: v.optional(v.string()),
  requiredSkills: v.array(v.string()),
  niceToHaveSkills: v.array(v.string()),
  minimumExperience: v.optional(v.string()),
  languages: v.array(v.string()),
  education: v.optional(v.string()),
  status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("closed"))),
  qcmQuestions: v.optional(
    v.array(
      v.object({
        id: v.string(),
        prompt: v.string(),
        options: v.array(
          v.object({
            id: v.string(),
            label: v.string(),
          })
        ),
        correctOptionId: v.string(),
      })
    )
  ),
  codingQuestion: v.optional(
    v.object({
      id: v.string(),
      title: v.string(),
      description: v.string(),
      examples: v.array(
        v.object({
          input: v.string(),
          output: v.string(),
          explanation: v.optional(v.string()),
        })
      ),
      starterCode: v.object({
        javascript: v.string(),
        python: v.string(),
        java: v.string(),
        cpp: v.string(),
      }),
      constraints: v.optional(v.array(v.string())),
    })
  ),
};

async function assertInterviewer(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name || identity.email || "Recruiter",
      email: identity.email || "",
      image: identity.pictureUrl,
      role: "interviewer",
    });
    return;
  }

  if (user.role !== "interviewer") {
    await ctx.db.patch(user._id, { role: "interviewer" });
  }
}

export const generateCvUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const submitApplication = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    position: v.string(),
    jobId: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    cvStorageId: v.id("_storage"),
    cvFileName: v.string(),
    cvFileSize: v.number(),
    cvFileType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const email = args.email.trim().toLowerCase();
    const existingApplication = await ctx.db
      .query("applications")
      .withIndex("by_email_job_id", (q) => q.eq("email", email).eq("jobId", args.jobId))
      .first();

    if (existingApplication) {
      await ctx.storage.delete(args.cvStorageId);
      throw new Error("You have already submitted an application for this job.");
    }

    const applicationId = await ctx.db.insert("applications", {
      ...args,
      email,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.applicationAnalysis.analyzeApplicationAfterSubmit, {
      id: applicationId,
    });

    return applicationId;
  },
});

export const getApplications = query({
  handler: async (ctx) => {
    await assertInterviewer(ctx);

    const applications = await ctx.db.query("applications").order("desc").collect();

    return applications.sort((a, b) => {
      const scoreDiff = (b.aiScore ?? -1) - (a.aiScore ?? -1);
      return scoreDiff !== 0 ? scoreDiff : b.createdAt - a.createdAt;
    });
  },
});

export const getApplicationsByJobId = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    await assertInterviewer(ctx);

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .collect();

    return applications.sort((a, b) => {
      const scoreDiff = (b.aiScore ?? -1) - (a.aiScore ?? -1);
      return scoreDiff !== 0 ? scoreDiff : b.createdAt - a.createdAt;
    });
  },
});

export const getApplicationById = query({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    await assertInterviewer(ctx);

    const application = await ctx.db.get(args.id);
    if (!application) return null;

    const cvUrl = await ctx.storage.getUrl(application.cvStorageId);
    const analysis = await ctx.db
      .query("cvAnalyses")
      .withIndex("by_application_id", (q) => q.eq("applicationId", args.id))
      .order("desc")
      .first();
    const job = application.jobId
      ? await ctx.db
          .query("jobs")
          .withIndex("by_job_id", (q) => q.eq("jobId", application.jobId!))
          .first()
      : null;

    return {
      ...application,
      cvUrl,
      analysis,
      job,
    };
  },
});

export const getJobByJobId = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    await assertInterviewer(ctx);

    return await ctx.db
      .query("jobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .first();
  },
});

export const getPublicJobs = query({
  handler: async (ctx) => {
    const jobs = await ctx.db.query("jobs").order("desc").collect();

    return jobs
      .filter((job) => (job.status ?? "published") === "published")
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getPublicJobByJobId = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("jobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .first();

    if (!job || (job.status ?? "published") !== "published") return null;

    return job;
  },
});

export const getJobs = query({
  handler: async (ctx) => {
    await assertInterviewer(ctx);

    const jobs = await ctx.db.query("jobs").order("desc").collect();

    return jobs.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const upsertJobRequirements = mutation({
  args: JOB_REQUIREMENTS,
  handler: async (ctx, args) => {
    await assertInterviewer(ctx);

    const now = Date.now();
    const existingJob = await ctx.db
      .query("jobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .first();

    if (existingJob) {
      await ctx.db.patch(existingJob._id, {
        ...args,
        updatedAt: now,
      });

      return existingJob._id;
    }

    return await ctx.db.insert("jobs", {
      ...args,
      status: args.status ?? "published",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateApplicationStatus = mutation({
  args: {
    id: v.id("applications"),
    status: APPLICATION_STATUSES,
  },
  handler: async (ctx, args) => {
    await assertInterviewer(ctx);

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const createAutoInterviewForTargetApplication = mutation({
  args: {
    id: v.id("applications"),
    streamCallId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.id);
    if (!application) throw new Error("Application not found");

    if (application.email.trim().toLowerCase() !== AUTO_TECHNICAL_INVITE_EMAIL) {
      return null;
    }

    const existingInterview = await ctx.db
      .query("interviews")
      .withIndex("by_application_id", (q) => q.eq("applicationId", args.id))
      .first();

    if (existingInterview) {
      return {
        created: false,
        interviewId: existingInterview._id,
        streamCallId: existingInterview.streamCallId,
        candidateEmail: application.email,
        candidateName: application.fullName,
        position: application.position,
        startTime: existingInterview.startTime,
        title: existingInterview.title,
        description: existingInterview.description,
      };
    }

    const interviewId = await ctx.db.insert("interviews", {
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      status: "upcoming",
      streamCallId: args.streamCallId,
      candidateId: application.email,
      applicationId: args.id,
      candidateName: application.fullName,
      candidateEmail: application.email,
      interviewerIds: [],
    });

    await ctx.db.patch(args.id, {
      status: "technical_invited",
      updatedAt: Date.now(),
    });

    return {
      created: true,
      interviewId,
      streamCallId: args.streamCallId,
      candidateEmail: application.email,
      candidateName: application.fullName,
      position: application.position,
      startTime: args.startTime,
      title: args.title,
      description: args.description,
    };
  },
});

export const deleteApplication = mutation({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    await assertInterviewer(ctx);

    const application = await ctx.db.get(args.id);
    if (!application) return;

    await ctx.storage.delete(application.cvStorageId);
    await ctx.db.delete(args.id);
  },
});

export const deleteJob = mutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    await assertInterviewer(ctx);

    if (!args.jobId) return;

    // 1. Delete jobs matching string jobId
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .collect();

    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }

    // 2. Also attempt document ID lookup if args.jobId is a direct Convex ID
    try {
      const jobById = await ctx.db.get(args.jobId as Id<"jobs">);
      if (jobById) {
        await ctx.db.delete(jobById._id);
      }
    } catch {
      // Ignore if args.jobId is not a valid Document ID format
    }
  },
});

export const getApplicationInternal = internalQuery({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getJobByJobIdInternal = internalQuery({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .first();
  },
});

export const saveAnalysisResult = internalMutation({
  args: {
    applicationId: v.id("applications"),
    jobId: v.optional(v.string()),
    score: v.number(),
    recommendation: AI_RECOMMENDATIONS,
    matchedSkills: v.array(v.string()),
    missingSkills: v.array(v.string()),
    experienceSummary: v.string(),
    strengths: v.array(v.string()),
    concerns: v.array(v.string()),
    decisionReason: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("cvAnalyses", {
      ...args,
      createdAt: now,
    });

    await ctx.db.patch(args.applicationId, {
      aiScore: args.score,
      aiRecommendation: args.recommendation,
      aiSummary: args.decisionReason,
      aiAnalyzedAt: now,
      status: args.recommendation === "strong_match" ? "cv_review_required" : "submitted",
      updatedAt: now,
    });
  },
});

export const markAnalysisStarted = internalMutation({
  args: { id: v.id("applications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      aiScore: undefined,
      aiRecommendation: undefined,
      aiSummary: undefined,
      aiAnalyzedAt: undefined,
      status: "cv_analyzing",
      updatedAt: Date.now(),
    });
  },
});

export const markAnalysisFailed = internalMutation({
  args: {
    id: v.id("applications"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "cv_review_required",
      aiSummary: args.message,
      updatedAt: Date.now(),
    });
  },
});

async function assertInterviewerForAction(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const user = await ctx.runQuery(internal.applications.getUserByClerkIdInternal, {
    clerkId: identity.subject,
  });

  if (user?.role !== "interviewer") {
    throw new Error("Only interviewers can run AI analysis");
  }
}

export const getUserByClerkIdInternal = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});
