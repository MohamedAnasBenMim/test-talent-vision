import { clsx, type ClassValue } from "clsx";
import { addHours, intervalToDuration, isBefore, isWithinInterval } from "date-fns";
import { twMerge } from "tailwind-merge";
import { Doc } from "../../convex/_generated/dataModel";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Interview = Doc<"interviews">;
type User = Doc<"users">;

export const groupInterviews = (interviews: Interview[]) => {
  if (!interviews) return {};

  return interviews.reduce((acc: any, interview: Interview) => {
    const status = getMeetingStatus(interview);

    if (interview.status === "succeeded") {
      acc.succeeded = [...(acc.succeeded || []), interview];
    } else if (interview.status === "failed") {
      acc.failed = [...(acc.failed || []), interview];
    } else if (status === "live") {
      acc.live = [...(acc.live || []), interview];
    } else if (status === "completed") {
      acc.completed = [...(acc.completed || []), interview];
    } else if (status === "upcoming") {
      acc.upcoming = [...(acc.upcoming || []), interview];
    }

    return acc;
  }, {});
};

export const getCandidateInfo = (
  users: User[],
  candidateId: string,
  fallback?: { name?: string; email?: string }
) => {
  const candidate = users?.find((user) => user.clerkId === candidateId);
  const displayName = candidate?.name || fallback?.name || fallback?.email || "Unknown Candidate";

  return {
    name: displayName,
    image: candidate?.image || "",
    initials:
      displayName
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "UC",
  };
};

export const getInterviewerInfo = (users: User[], interviewerId: string) => {
  if (interviewerId === "AI_SUPER_RECRUITER") {
    return {
      name: "AI Insights",
      image: "",
      initials: "AI",
    };
  }
  
  const interviewer = users?.find((user) => user.clerkId === interviewerId);
  return {
    name: interviewer?.name || "Unknown Interviewer",
    image: interviewer?.image,
    initials:
      interviewer?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("") || "UI",
  };
};

export const calculateRecordingDuration = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const duration = intervalToDuration({ start, end });

  if (duration.hours && duration.hours > 0) {
    return `${duration.hours}:${String(duration.minutes).padStart(2, "0")}:${String(
      duration.seconds
    ).padStart(2, "0")}`;
  }

  if (duration.minutes && duration.minutes > 0) {
    return `${duration.minutes}:${String(duration.seconds).padStart(2, "0")}`;
  }

  return `${duration.seconds} seconds`;
};

export const getMeetingStatus = (interview: Interview, now = new Date()) => {
  const interviewStartTime = new Date(interview.startTime);
  const endTime = addHours(interviewStartTime, 1);

  if (
    interview.status === "completed" ||
    interview.status === "failed" ||
    interview.status === "succeeded"
  )
    return "completed";
  if (isWithinInterval(now, { start: interviewStartTime, end: endTime })) return "live";
  if (isBefore(now, interviewStartTime)) return "upcoming";
  return "completed";
};
