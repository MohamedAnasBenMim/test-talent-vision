import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

const EXAM_DURATION_MS = 15 * 60 * 1000;
const PASS_SCORE = 70;
const MAX_WARNINGS_BEFORE_AUTO_SUBMIT = 3;
const WARNING_DEDUPE_MS = 2500;

const QUESTION_BANK = [
  {
    id: "html-paragraph",
    prompt: "Which HTML tag is used to create a paragraph?",
    options: [
      { id: "a", label: "<p>" },
      { id: "b", label: "<h1>" },
      { id: "c", label: "<div>" },
      { id: "d", label: "<br>" },
    ],
    correctOptionId: "a",
  },
  {
    id: "css-background",
    prompt: "Which CSS property is used to change the background color?",
    options: [
      { id: "a", label: "color" },
      { id: "b", label: "background-color" },
      { id: "c", label: "font-color" },
      { id: "d", label: "bg" },
    ],
    correctOptionId: "b",
  },
  {
    id: "javascript-console",
    prompt: "Which command is commonly used to print something in the browser console?",
    options: [
      { id: "a", label: "print()" },
      { id: "b", label: "console.log()" },
      { id: "c", label: "echo()" },
      { id: "d", label: "write.console()" },
    ],
    correctOptionId: "b",
  },
  {
    id: "git-status",
    prompt: "What does `git status` show?",
    options: [
      { id: "a", label: "The current state of your Git repository." },
      { id: "b", label: "Deletes all changes." },
      { id: "c", label: "Creates a new repository." },
      { id: "d", label: "Uploads code to GitHub." },
    ],
    correctOptionId: "a",
  },
  {
    id: "docker-image",
    prompt: "What is a Docker image?",
    options: [
      { id: "a", label: "A template used to create containers." },
      { id: "b", label: "A programming language." },
      { id: "c", label: "A database." },
      { id: "d", label: "A web browser." },
    ],
    correctOptionId: "a",
  },
] as const;

const PUBLIC_QUESTIONS = QUESTION_BANK.map(({ correctOptionId, ...question }) => question);

const EVENT_TYPES = v.union(
  v.literal("fullscreen_left"),
  v.literal("tab_hidden"),
  v.literal("window_blur"),
  v.literal("copy_blocked"),
  v.literal("paste_blocked"),
  v.literal("context_menu_blocked"),
  v.literal("auto_submit")
);

type Identity = {
  subject: string;
  email?: string;
};

type AssessmentAnswer = {
  questionId: string;
  selectedOptionId: string;
};

function getIdentityEmail(identity: Identity, currentUser?: Doc<"users"> | null) {
  return (identity.email ?? currentUser?.email)?.trim().toLowerCase();
}

function isCandidateForInterview(
  identity: Identity,
  interview: Doc<"interviews">,
  currentUser?: Doc<"users"> | null
) {
  const email = getIdentityEmail(identity, currentUser);

  return (
    interview.candidateId === identity.subject ||
    Boolean(email && interview.candidateId.toLowerCase() === email) ||
    Boolean(email && interview.candidateEmail?.toLowerCase() === email)
  );
}

async function getCurrentUser(ctx: any, identity: Identity) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();
}

async function getAuthorizedInterview(ctx: any, streamCallId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const interview = await ctx.db
    .query("interviews")
    .withIndex("by_stream_call_id", (q: any) => q.eq("streamCallId", streamCallId))
    .first();

  if (!interview) throw new Error("Interview not found");

  const currentUser = await getCurrentUser(ctx, identity);
  const isInterviewer = currentUser?.role === "interviewer";
  const isCandidate = isCandidateForInterview(identity, interview, currentUser);

  if (!isInterviewer && !isCandidate) {
    throw new Error("You do not have access to this assessment");
  }

  return { identity, interview, currentUser, isInterviewer, isCandidate };
}

async function findAttemptForIdentity(
  ctx: any,
  streamCallId: string,
  identity: Identity,
  currentUser?: Doc<"users"> | null
) {
  const email = getIdentityEmail(identity, currentUser);
  const attempts = await ctx.db
    .query("assessmentAttempts")
    .withIndex("by_stream_call_id", (q: any) => q.eq("streamCallId", streamCallId))
    .collect();

  return (
    attempts.find(
      (attempt: Doc<"assessmentAttempts">) =>
        attempt.candidateId === identity.subject ||
        Boolean(email && attempt.candidateId.toLowerCase() === email) ||
        Boolean(email && attempt.candidateEmail?.toLowerCase() === email)
    ) ?? null
  );
}

async function getAttemptEvents(ctx: any, attemptId: Id<"assessmentAttempts">) {
  return await ctx.db
    .query("assessmentEvents")
    .withIndex("by_attempt_id", (q: any) => q.eq("attemptId", attemptId))
    .collect();
}

function scoreAnswers(answers: AssessmentAnswer[]) {
  const correctAnswers = QUESTION_BANK.reduce((count, question) => {
    const answer = answers.find((item) => item.questionId === question.id);
    return answer?.selectedOptionId === question.correctOptionId ? count + 1 : count;
  }, 0);

  const score = Math.round((correctAnswers / QUESTION_BANK.length) * 100);

  return {
    correctAnswers,
    score,
    passed: score >= PASS_SCORE,
  };
}

function normalizeAnswers(answers: AssessmentAnswer[]) {
  return answers.filter((answer) => {
    const question = QUESTION_BANK.find((item) => item.id === answer.questionId);
    return Boolean(question?.options.some((option) => option.id === answer.selectedOptionId));
  });
}

function getEventDedupeKey(type: string) {
  if (type === "tab_hidden" || type === "window_blur") return "focus_leave";
  return type;
}

export const getExamState = query({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db
      .query("interviews")
      .withIndex("by_stream_call_id", (q: any) => q.eq("streamCallId", args.streamCallId))
      .first();

    if (!interview) throw new Error("Interview not found");

    const currentUser = await getCurrentUser(ctx, identity);
    const isInterviewer = currentUser?.role === "interviewer";
    const isCandidate = isCandidateForInterview(identity, interview, currentUser);

    if (!isInterviewer && !isCandidate) {
      return {
        accessDenied: true,
        interviewId: interview._id,
        durationMs: EXAM_DURATION_MS,
        passScore: PASS_SCORE,
        maxWarningsBeforeAutoSubmit: MAX_WARNINGS_BEFORE_AUTO_SUBMIT,
        questions: [],
        attempt: null,
        warningCount: 0,
        isInterviewer: false,
        isCandidate: false,
      };
    }

    const attempt = isCandidate
      ? await findAttemptForIdentity(ctx, args.streamCallId, identity, currentUser)
      : null;
    const events = attempt ? await getAttemptEvents(ctx, attempt._id) : [];

    return {
      accessDenied: false,
      interviewId: interview._id,
      durationMs: EXAM_DURATION_MS,
      passScore: PASS_SCORE,
      maxWarningsBeforeAutoSubmit: MAX_WARNINGS_BEFORE_AUTO_SUBMIT,
      questions: PUBLIC_QUESTIONS,
      attempt,
      warningCount: events.length,
      isInterviewer,
      isCandidate,
    };
  },
});

export const startAttempt = mutation({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    const { identity, interview, currentUser, isCandidate } = await getAuthorizedInterview(
      ctx,
      args.streamCallId
    );
    if (!isCandidate) throw new Error("Only the candidate can start this assessment");

    const existingAttempt = await findAttemptForIdentity(
      ctx,
      args.streamCallId,
      identity,
      currentUser
    );
    if (existingAttempt) return existingAttempt._id;

    const now = Date.now();

    return await ctx.db.insert("assessmentAttempts", {
      streamCallId: args.streamCallId,
      interviewId: interview._id,
      candidateId: identity.subject,
      candidateEmail: getIdentityEmail(identity, currentUser),
      status: "in_progress",
      startedAt: now,
      expiresAt: now + EXAM_DURATION_MS,
      totalQuestions: QUESTION_BANK.length,
      answers: [],
    });
  },
});

export const saveAnswer = mutation({
  args: {
    streamCallId: v.string(),
    questionId: v.string(),
    selectedOptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, currentUser, isCandidate } = await getAuthorizedInterview(
      ctx,
      args.streamCallId
    );
    if (!isCandidate) throw new Error("Only the candidate can answer this assessment");

    const attempt = await findAttemptForIdentity(ctx, args.streamCallId, identity, currentUser);
    if (!attempt) throw new Error("Start the assessment before answering");
    if (attempt.status !== "in_progress") throw new Error("This assessment is already submitted");
    if (Date.now() > attempt.expiresAt) throw new Error("Assessment time has ended");

    const question = QUESTION_BANK.find((item) => item.id === args.questionId);
    if (!question?.options.some((option) => option.id === args.selectedOptionId)) {
      throw new Error("Invalid answer");
    }

    const answers = [
      ...attempt.answers.filter(
        (answer: AssessmentAnswer) => answer.questionId !== args.questionId
      ),
      {
        questionId: args.questionId,
        selectedOptionId: args.selectedOptionId,
      },
    ];

    await ctx.db.patch(attempt._id, { answers });
  },
});

export const submitAttempt = mutation({
  args: {
    streamCallId: v.string(),
    autoSubmitted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { identity, currentUser, isCandidate } = await getAuthorizedInterview(
      ctx,
      args.streamCallId
    );
    if (!isCandidate) throw new Error("Only the candidate can submit this assessment");

    const attempt = await findAttemptForIdentity(ctx, args.streamCallId, identity, currentUser);
    if (!attempt) throw new Error("No assessment attempt found");
    if (attempt.status !== "in_progress") return attempt._id;

    const answers = normalizeAnswers(attempt.answers);
    const result = scoreAnswers(answers);

    await ctx.db.patch(attempt._id, {
      status: args.autoSubmitted ? "auto_submitted" : "submitted",
      answers,
      submittedAt: Date.now(),
      ...result,
    });

    return attempt._id;
  },
});

export const logEvent = mutation({
  args: {
    streamCallId: v.string(),
    type: EVENT_TYPES,
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity, currentUser, isCandidate } = await getAuthorizedInterview(
      ctx,
      args.streamCallId
    );
    if (!isCandidate) throw new Error("Only the candidate can log assessment events");

    const attempt = await findAttemptForIdentity(ctx, args.streamCallId, identity, currentUser);
    if (!attempt || attempt.status !== "in_progress") return;

    const now = Date.now();
    const dedupeKey = getEventDedupeKey(args.type);
    const recentEvents = await getAttemptEvents(ctx, attempt._id);
    const duplicateEvent = recentEvents.some((event: Doc<"assessmentEvents">) => {
      return getEventDedupeKey(event.type) === dedupeKey && now - event.createdAt < WARNING_DEDUPE_MS;
    });

    if (duplicateEvent) return;

    await ctx.db.insert("assessmentEvents", {
      attemptId: attempt._id,
      streamCallId: args.streamCallId,
      candidateId: identity.subject,
      type: args.type,
      message: args.message,
      createdAt: now,
    });
  },
});

export const getAssessmentReportByInterview = query({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await getCurrentUser(ctx, identity);
    if (currentUser?.role !== "interviewer") {
      throw new Error("Only interviewers can view assessment reports");
    }

    const attempts = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_interview_id", (q: any) => q.eq("interviewId", args.interviewId))
      .collect();

    const attempt = attempts.sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;
    if (!attempt) return null;

    const events = await getAttemptEvents(ctx, attempt._id);

    return {
      attempt,
      events: events.sort(
        (a: Doc<"assessmentEvents">, b: Doc<"assessmentEvents">) => a.createdAt - b.createdAt
      ),
      passScore: PASS_SCORE,
    };
  },
});

export const getAssessmentReportByApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await getCurrentUser(ctx, identity);
    if (currentUser?.role !== "interviewer") {
      throw new Error("Only interviewers can view assessment reports");
    }

    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_application_id", (q: any) => q.eq("applicationId", args.applicationId))
      .collect();

    const attempts = await Promise.all(
      interviews.map(async (interview: Doc<"interviews">) => {
        return await ctx.db
          .query("assessmentAttempts")
          .withIndex("by_interview_id", (q: any) => q.eq("interviewId", interview._id))
          .collect();
      })
    );

    const attempt =
      attempts
        .flat()
        .sort((a: Doc<"assessmentAttempts">, b: Doc<"assessmentAttempts">) => b.startedAt - a.startedAt)[0] ??
      null;

    if (!attempt) return null;

    const events = await getAttemptEvents(ctx, attempt._id);

    return {
      attempt,
      events: events.sort(
        (a: Doc<"assessmentEvents">, b: Doc<"assessmentEvents">) => a.createdAt - b.createdAt
      ),
      passScore: PASS_SCORE,
    };
  },
});
