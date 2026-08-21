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

export const deleteByStreamCallId = mutation({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (currentUser?.role !== "interviewer") {
      throw new Error("Only interviewers can delete calls");
    }

    const interview = await ctx.db
      .query("interviews")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();

    if (interview) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_interview_id", (q) => q.eq("interviewId", interview._id))
        .collect();

      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }

      await ctx.db.delete(interview._id);
    }

    const codeSession = await ctx.db
      .query("codeSessions")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();

    if (codeSession) {
      await ctx.db.delete(codeSession._id);
    }
  },
});
