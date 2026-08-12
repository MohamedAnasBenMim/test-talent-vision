import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByStreamCallId = query({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db
      .query("codeSessions")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    streamCallId: v.string(),
    interviewId: v.optional(v.id("interviews")),
    code: v.string(),
    language: v.string(),
    questionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = args.interviewId ? await ctx.db.get(args.interviewId) : null;
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    const email = (identity.email ?? currentUser?.email)?.trim().toLowerCase();
    const isInterviewCandidate =
      interview &&
      (interview.candidateId === identity.subject ||
        Boolean(email && interview.candidateId.toLowerCase() === email) ||
        Boolean(email && interview.candidateEmail?.toLowerCase() === email));

    if (interview && !isInterviewCandidate) {
      throw new Error("Only the candidate can update this code session");
    }

    const existingSession = await ctx.db
      .query("codeSessions")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();

    if (!interview && existingSession?.candidateId && existingSession.candidateId !== identity.subject) {
      throw new Error("Only the candidate can update this code session");
    }

    const payload = {
      ...args,
      candidateId: interview?.candidateId ?? existingSession?.candidateId ?? identity.subject,
      updatedAt: Date.now(),
      updatedBy: identity.subject,
    };

    if (existingSession) {
      await ctx.db.patch(existingSession._id, payload);
      return existingSession._id;
    }

    return await ctx.db.insert("codeSessions", payload);
  },
});
