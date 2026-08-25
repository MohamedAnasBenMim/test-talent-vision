import { BadgeProps } from "@/components/ui/badge";

export const APPLICATION_STATUS_LABELS = {
  submitted: "Submitted",
  cv_analyzing: "CV Analyzing",
  cv_review_required: "Review Required",
  cv_rejected: "CV Rejected",
  technical_invited: "Technical Invited",
  technical_passed: "Technical Passed",
  technical_failed: "Technical Failed",
  hr_shortlisted: "HR Shortlisted",
  hr_rejected: "HR Rejected",
  saved_to_talent_pool: "Talent Pool",
} as const;

export type ApplicationStatus = keyof typeof APPLICATION_STATUS_LABELS;

export function getApplicationStatusVariant(
  status: ApplicationStatus
): BadgeProps["variant"] {
  if (status === "cv_rejected" || status === "technical_failed" || status === "hr_rejected") return "destructive";
  if (status === "technical_invited" || status === "submitted" || status === "hr_shortlisted") return "default";
  if (status === "saved_to_talent_pool" || status === "technical_passed") return "secondary";
  return "outline";
}

export const AI_RECOMMENDATION_LABELS = {
  strong_match: "Strong Match",
  maybe: "Maybe",
  weak_match: "Weak Match",
} as const;

export type AiRecommendation = keyof typeof AI_RECOMMENDATION_LABELS;

export function getAiRecommendationVariant(
  recommendation?: AiRecommendation
): BadgeProps["variant"] {
  if (recommendation === "strong_match") return "default";
  if (recommendation === "weak_match") return "destructive";
  return "outline";
}

export type FinalHrRecommendation =
  | "strong_recommend_hr"
  | "recommend_hr"
  | "reconsider_hr"
  | "reject_hr";

export const FINAL_HR_RECOMMENDATION_LABELS: Record<FinalHrRecommendation, string> = {
  strong_recommend_hr: "⭐ Top HR Shortlist",
  recommend_hr: "✅ Recommend for HR",
  reconsider_hr: "Review",
  reject_hr: "❌ Do Not Proceed",
};

export function getFinalHrRecommendationVariant(
  recommendation?: FinalHrRecommendation
): BadgeProps["variant"] {
  if (recommendation === "strong_recommend_hr" || recommendation === "recommend_hr") return "default";
  if (recommendation === "reject_hr") return "destructive";
  return "outline";
}
