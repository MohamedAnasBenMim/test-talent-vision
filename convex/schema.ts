import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    role: v.union(v.literal("candidate"), v.literal("interviewer")),
    clerkId: v.string(),
  }).index("by_clerk_id", ["clerkId"]),

  interviews: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.string(),
    streamCallId: v.string(),
    candidateId: v.string(),
    applicationId: v.optional(v.id("applications")),
    candidateName: v.optional(v.string()),
    candidateEmail: v.optional(v.string()),
    interviewerIds: v.array(v.string()),
  })
    .index("by_candidate_id", ["candidateId"])
    .index("by_stream_call_id", ["streamCallId"])
    .index("by_application_id", ["applicationId"]),

  applications: defineTable({
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
    cvScore: v.optional(v.number()),
    technicalScore: v.optional(v.number()),
    finalScore: v.optional(v.number()),
    finalRecommendation: v.optional(
      v.union(
        v.literal("strong_recommend_hr"),
        v.literal("recommend_hr"),
        v.literal("reconsider_hr"),
        v.literal("reject_hr")
      )
    ),
    finalSynthesis: v.optional(v.string()),
    aiScore: v.optional(v.number()),
    aiRecommendation: v.optional(
      v.union(v.literal("strong_match"), v.literal("maybe"), v.literal("weak_match"))
    ),
    aiSummary: v.optional(v.string()),
    aiAnalyzedAt: v.optional(v.number()),
    status: v.union(
      v.literal("submitted"),
      v.literal("cv_analyzing"),
      v.literal("cv_review_required"),
      v.literal("cv_rejected"),
      v.literal("technical_invited"),
      v.literal("technical_passed"),
      v.literal("technical_failed"),
      v.literal("hr_shortlisted"),
      v.literal("hr_rejected"),
      v.literal("saved_to_talent_pool")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_job_id", ["jobId"])
    .index("by_email_job_id", ["email", "jobId"]),

  jobs: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_job_id", ["jobId"])
    .index("by_status", ["status"]),

  cvAnalyses: defineTable({
    applicationId: v.id("applications"),
    jobId: v.optional(v.string()),
    score: v.number(),
    recommendation: v.union(
      v.literal("strong_match"),
      v.literal("maybe"),
      v.literal("weak_match")
    ),
    matchedSkills: v.array(v.string()),
    missingSkills: v.array(v.string()),
    experienceSummary: v.string(),
    strengths: v.array(v.string()),
    concerns: v.array(v.string()),
    decisionReason: v.string(),
    model: v.string(),
    createdAt: v.number(),
  })
    .index("by_application_id", ["applicationId"])
    .index("by_job_id", ["jobId"]),

  comments: defineTable({
    content: v.string(),
    rating: v.number(),
    interviewerId: v.string(),
    interviewId: v.id("interviews"),
  }).index("by_interview_id", ["interviewId"]),

  codeSessions: defineTable({
    streamCallId: v.string(),
    interviewId: v.optional(v.id("interviews")),
    candidateId: v.optional(v.string()),
    code: v.string(),
    language: v.string(),
    questionId: v.string(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index("by_stream_call_id", ["streamCallId"]),

  assessmentAttempts: defineTable({
    streamCallId: v.string(),
    interviewId: v.id("interviews"),
    candidateId: v.string(),
    candidateEmail: v.optional(v.string()),
    status: v.union(
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("auto_submitted")
    ),
    startedAt: v.number(),
    expiresAt: v.number(),
    submittedAt: v.optional(v.number()),
    totalQuestions: v.number(),
    correctAnswers: v.optional(v.number()),
    score: v.optional(v.number()),
    passed: v.optional(v.boolean()),
    answers: v.array(
      v.object({
        questionId: v.string(),
        selectedOptionId: v.string(),
      })
    ),
  })
    .index("by_stream_call_id", ["streamCallId"])
    .index("by_interview_id", ["interviewId"])
    .index("by_candidate_id", ["candidateId"]),

  assessmentEvents: defineTable({
    attemptId: v.id("assessmentAttempts"),
    streamCallId: v.string(),
    candidateId: v.string(),
    type: v.string(),
    message: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_attempt_id", ["attemptId"])
    .index("by_stream_call_id", ["streamCallId"]),

  assessmentRecordings: defineTable({
    attemptId: v.id("assessmentAttempts"),
    streamCallId: v.string(),
    candidateId: v.string(),
    candidateEmail: v.optional(v.string()),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    durationMs: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_attempt_id", ["attemptId"])
    .index("by_stream_call_id", ["streamCallId"]),
});
