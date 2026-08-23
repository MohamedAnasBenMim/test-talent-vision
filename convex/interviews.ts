import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getInterviewInternal = internalQuery({
  args: { id: v.id("interviews") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getAllInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interviews = await ctx.db.query("interviews").collect();

    return interviews;
  },
});

export const getMyInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const interviewsByClerkId = await ctx.db
      .query("interviews")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    const email = (identity.email ?? currentUser?.email)?.trim().toLowerCase();
    const interviewsByEmail = email
      ? await ctx.db
          .query("interviews")
          .withIndex("by_candidate_id", (q) => q.eq("candidateId", email))
          .collect()
      : [];

    const allInterviews = [...interviewsByClerkId, ...interviewsByEmail];
    return Array.from(new Map(allInterviews.map((interview) => [interview._id, interview])).values());
  },
});

export const getInterviewByStreamCallId = query({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("interviews")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();
  },
});

export const getInterviewByApplicationId = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db
      .query("interviews")
      .withIndex("by_application_id", (q) => q.eq("applicationId", args.applicationId))
      .first();
  },
});

export const createInterview = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    status: v.string(),
    streamCallId: v.string(),
    candidateId: v.string(),
    applicationId: v.optional(v.id("applications")),
    candidateName: v.optional(v.string()),
    candidateEmail: v.optional(v.string()),
    interviewerIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("interviews", {
      ...args,
    });
  },
});

export const updateInterviewStatus = mutation({
  args: {
    id: v.id("interviews"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "completed" ? { endTime: Date.now() } : {}),
    });
  },
});

export const deleteInterview = mutation({
  args: { id: v.id("interviews") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db.get(args.id);
    if (!interview) return;

    // Delete associated comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_interview_id", (q) => q.eq("interviewId", interview._id))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete associated code sessions if streamCallId exists
    if (interview.streamCallId) {
      const codeSessions = await ctx.db
        .query("codeSessions")
        .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", interview.streamCallId))
        .collect();

      for (const session of codeSessions) {
        await ctx.db.delete(session._id);
      }
    }

    await ctx.db.delete(interview._id);
  },
});

export const deleteByStreamCallId = mutation({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Collect and delete all interviews matching streamCallId
    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .collect();

    for (const interview of interviews) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_interview_id", (q) => q.eq("interviewId", interview._id))
        .collect();

      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }

      await ctx.db.delete(interview._id);
    }

    // Collect and delete all code sessions matching streamCallId
    const codeSessions = await ctx.db
      .query("codeSessions")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .collect();

    for (const session of codeSessions) {
      await ctx.db.delete(session._id);
    }
  },
});

export const getJobForStreamCall = query({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    const interview = await ctx.db
      .query("interviews")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();

    if (!interview) return null;

    if (interview.applicationId) {
      const application = await ctx.db.get(interview.applicationId);
      if (application?.jobId) {
        const targetJobId = application.jobId;
        const job = await ctx.db
          .query("jobs")
          .withIndex("by_job_id", (q) => q.eq("jobId", targetJobId))
          .first();
        if (job) return job;
      }
    }

    const jobs = await ctx.db.query("jobs").collect();
    return (
      jobs.find(
        (j) =>
          j.jobId === interview.title ||
          j.title.toLowerCase() === interview.title.toLowerCase()
      ) ?? null
    );
  },
});
