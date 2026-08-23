"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { sendApplicationRejectionEmail } from "@/actions/application.actions";
import { sendInterviewInvite } from "@/actions/invite.actions";
import { createStreamInterviewCall } from "@/actions/stream.actions";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  APPLICATION_STATUS_LABELS,
  AI_RECOMMENDATION_LABELS,
  FINAL_HR_RECOMMENDATION_LABELS,
  ApplicationStatus,
  AiRecommendation,
  FinalHrRecommendation,
  getAiRecommendationVariant,
  getApplicationStatusVariant,
  getFinalHrRecommendationVariant,
} from "@/components/applications/status";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  BriefcaseBusinessIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GithubIcon,
  LinkedinIcon,
  LinkIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  RefreshCcwIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
  UserCheckIcon,
  UserIcon,
  VideoIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const HOURS_24 = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

type ApplicationDetailProps = {
  applicationId: string;
};

function getTimeParts(time: string) {
  const [hour = "09", minute = "00"] = time.split(":");
  return { hour, minute };
}

function setTimePart(time: string, part: "hour" | "minute", value: string) {
  const { hour, minute } = getTimeParts(time);
  return part === "hour" ? `${value}:${minute}` : `${hour}:${value}`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function CandidateLink({
  href,
  icon,
  label,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
}) {
  if (!href) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/45 p-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        <span>Not provided</span>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg border border-border/70 bg-background/45 p-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/10"
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <ExternalLinkIcon className="size-4 shrink-0 text-primary" />
    </a>
  );
}

export default function ApplicationDetail({ applicationId }: ApplicationDetailProps) {
  const convexApplicationId = applicationId as Id<"applications">;
  const application = useQuery(api.applications.getApplicationById, {
    id: convexApplicationId,
  });
  const scheduledInterview = useQuery(
    api.interviews.getInterviewByApplicationId,
    application ? { applicationId: application._id } : "skip"
  );
  const assessmentReport = useQuery(
    api.assessments.getAssessmentReportByApplication,
    application ? { applicationId: application._id } : "skip"
  );
  const rerunApplicationAnalysis = useAction(api.applicationAnalysis.rerunApplicationAnalysis);
  const updateApplicationStatus = useMutation(api.applications.updateApplicationStatus);
  const updateCandidateFinalEvaluation = useMutation(api.applications.updateCandidateFinalEvaluation);
  const createInterview = useMutation(api.interviews.createInterview);
  const { user } = useUser();
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRerunningAnalysis, setIsRerunningAnalysis] = useState(false);
  const [isEvaluatingFinal, setIsEvaluatingFinal] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleCalculateFinalEvaluation = async () => {
    if (!application) return;
    setIsEvaluatingFinal(true);
    try {
      const techScore = assessmentReport?.attempt?.score ?? application.technicalScore ?? 85;
      await updateCandidateFinalEvaluation({
        id: application._id,
        technicalScore: techScore,
      });
      toast.success("Final AI Evaluation & HR Recommendation generated!");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to calculate final evaluation");
    } finally {
      setIsEvaluatingFinal(false);
    }
  };

  const handleShortlistForHR = async () => {
    if (!application) return;
    setIsEvaluatingFinal(true);
    try {
      await updateCandidateFinalEvaluation({
        id: application._id,
        status: "hr_shortlisted",
      });
      toast.success("Candidate successfully shortlisted for HR Interview!");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to shortlist candidate");
    } finally {
      setIsEvaluatingFinal(false);
    }
  };
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    description: "",
    date: new Date(),
    time: "09:00",
  });

  const status = application?.status as ApplicationStatus | undefined;
  const defaultTitle = useMemo(() => {
    if (!application) return "";
    return `Technical Interview - ${application.position}`;
  }, [application]);

  const openScheduleDialog = () => {
    setScheduleForm((prev) => ({
      ...prev,
      title: prev.title || defaultTitle,
      description: prev.description,
    }));
    setIsScheduleOpen(true);
  };

  const handleReject = async () => {
    if (!application) return;

    setIsRejecting(true);

    try {
      await sendApplicationRejectionEmail({
        candidateEmail: application.email,
        candidateName: application.fullName,
        position: application.position,
      });
      await updateApplicationStatus({
        id: application._id,
        status: "cv_rejected",
      });
      toast.success("Candidate rejected and email sent");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to reject candidate");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleRerunAnalysis = async () => {
    if (!application) return;

    setIsRerunningAnalysis(true);

    try {
      await rerunApplicationAnalysis({ id: application._id });
      toast.success("AI screening completed");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to run AI screening");
    } finally {
      setIsRerunningAnalysis(false);
    }
  };

  const handleScheduleInterview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!application || !user) return;

    setIsScheduling(true);

    try {
      const [hours, minutes] = scheduleForm.time.split(":").map(Number);

      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        toast.error("Please choose a valid time");
        return;
      }

      const meetingDate = new Date(scheduleForm.date);
      meetingDate.setHours(hours, minutes, 0, 0);

      const streamCallId = crypto.randomUUID();

      await createStreamInterviewCall({
        callId: streamCallId,
        title: scheduleForm.title,
        description: scheduleForm.description,
        startsAt: meetingDate.toISOString(),
      });

      await createInterview({
        title: scheduleForm.title,
        description: scheduleForm.description,
        startTime: meetingDate.getTime(),
        status: "upcoming",
        streamCallId,
        candidateId: application.email,
        applicationId: application._id,
        candidateName: application.fullName,
        candidateEmail: application.email,
        interviewerIds: [user.id],
      });

      const meetingUrl = `${window.location.origin}/meeting/${streamCallId}`;

      await sendInterviewInvite({
        candidateEmail: application.email,
        candidateName: application.fullName,
        interviewTitle: scheduleForm.title,
        interviewDescription: scheduleForm.description,
        startTime: meetingDate.getTime(),
        meetingUrl,
      });

      await updateApplicationStatus({
        id: application._id,
        status: "technical_invited",
      });

      toast.success("Technical interview scheduled and invitation email sent");
      setIsScheduleOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to schedule interview");
    } finally {
      setIsScheduling(false);
    }
  };

  if (application === undefined) return <LoaderUI />;

  if (!application) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold">Application Not Found</h1>
            <Button asChild className="mt-6">
              <Link href="/dashboard/applications">Back to Applications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submittedAt = format(new Date(application.createdAt), "EEEE, MMMM d, yyyy · h:mm a");
  const canInvite = application.status !== "technical_invited";
  const canReject = application.status !== "cv_rejected";
  const recommendation = application.aiRecommendation as AiRecommendation | undefined;

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/dashboard/applications">
            <ArrowLeftIcon className="size-3.5" />
            Back to Candidates
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-fuchsia-400" />
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Candidate Application
                  </p>
                  <CardTitle className="mt-3 text-3xl">{application.fullName}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">{application.position}</p>
                </div>
                {status && (
                  <Badge variant={getApplicationStatusVariant(status)}>
                    {APPLICATION_STATUS_LABELS[status]}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoItem icon={<MailIcon className="size-4 text-primary" />} label="Email">
                {application.email}
              </InfoItem>
              <InfoItem icon={<PhoneIcon className="size-4 text-primary" />} label="Phone">
                {application.phone}
              </InfoItem>
              <InfoItem icon={<BriefcaseBusinessIcon className="size-4 text-accent" />} label="Position">
                {application.position}
              </InfoItem>
              <InfoItem icon={<CalendarIcon className="size-4 text-accent" />} label="Submitted">
                {submittedAt}
              </InfoItem>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CV File</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold">{application.cvFileName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatFileSize(application.cvFileSize)} · {application.cvFileType}
                </p>
              </div>
              <Button asChild disabled={!application.cvUrl}>
                <a href={application.cvUrl ?? "#"} target="_blank" rel="noreferrer">
                  <FileTextIcon className="size-4" />
                  View CV
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Candidate Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <CandidateLink
                href={application.portfolioUrl}
                icon={<LinkIcon className="size-4 text-primary" />}
                label="Portfolio"
              />
              <CandidateLink
                href={application.githubUrl}
                icon={<GithubIcon className="size-4 text-primary" />}
                label="GitHub"
              />
              <CandidateLink
                href={application.linkedinUrl}
                icon={<LinkedinIcon className="size-4 text-primary" />}
                label="LinkedIn"
              />
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          {/* Executive Final AI Synthesis & HR Recommendation Card */}
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <TrophyIcon className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Final AI Synthesis & HR Recommendation</CardTitle>
                    <p className="text-xs text-muted-foreground">Integrated CV + Technical Assessment Evaluation</p>
                  </div>
                </div>
                {application.finalRecommendation && (
                  <Badge variant={getFinalHrRecommendationVariant(application.finalRecommendation as FinalHrRecommendation)}>
                    {FINAL_HR_RECOMMENDATION_LABELS[application.finalRecommendation as FinalHrRecommendation]}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dual-Score Comparison Grid */}
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-primary/20 bg-background/60 p-3 text-center">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    📄 CV Match
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {application.cvScore ?? application.aiScore ?? "--"}
                    <span className="text-[10px] text-muted-foreground font-normal">/100</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground">Pre-interview (40%)</p>
                </div>

                <div className="space-y-0.5 border-x border-border/50 px-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    💻 Tech Score
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {application.technicalScore ?? assessmentReport?.attempt?.score ?? "--"}
                    <span className="text-[10px] text-muted-foreground font-normal">/100</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground">Coding & QCM (60%)</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                    ⭐ Final Score
                  </p>
                  <p className="text-xl font-black text-primary">
                    {application.finalScore ?? "--"}
                    <span className="text-[10px] text-muted-foreground font-normal">/100</span>
                  </p>
                  <p className="text-[9px] text-primary/80 font-medium">Composite</p>
                </div>
              </div>

              {/* AI Synthesis Executive Rationale */}
              {application.finalSynthesis ? (
                <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <SparklesIcon className="size-3.5" /> AI Knowledge Synthesis
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {application.finalSynthesis}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Click below to synthesize pre-interview CV score & live technical interview performance into a final HR recommendation.
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  onClick={handleCalculateFinalEvaluation}
                  disabled={isEvaluatingFinal}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5 border-primary/30"
                >
                  {isEvaluatingFinal ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5 text-primary" />}
                  {application.finalScore ? "Recalculate Final AI Score" : "Generate Final AI Synthesis"}
                </Button>

                <Button
                  onClick={handleShortlistForHR}
                  disabled={isEvaluatingFinal || application.status === "hr_shortlisted"}
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <UserCheckIcon className="size-3.5" />
                  {application.status === "hr_shortlisted" ? "Candidate Shortlisted for HR Round" : "Shortlist for HR Interview"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>AI Screening</CardTitle>
                <div className="flex items-center gap-2">
                  {recommendation && (
                    <Badge variant={getAiRecommendationVariant(recommendation)}>
                      {AI_RECOMMENDATION_LABELS[recommendation]}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRerunningAnalysis || application.status === "cv_analyzing"}
                    onClick={handleRerunAnalysis}
                  >
                    {isRerunningAnalysis || application.status === "cv_analyzing" ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <RefreshCcwIcon className="size-4" />
                    )}
                    Retry
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-background/45 p-4">
                <p className="text-sm text-muted-foreground">Score</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-4xl font-bold text-foreground">
                    {application.aiScore ?? "--"}
                  </span>
                  <span className="pb-1 text-sm text-muted-foreground">/ 100</span>
                </div>
                {application.aiSummary && (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {application.aiSummary}
                  </p>
                )}
              </div>

              {application.analysis ? (
                <div className="grid gap-3">
                  <AnalysisList title="Matched Skills" items={application.analysis.matchedSkills} />
                  <AnalysisList title="Missing Skills" items={application.analysis.missingSkills} />
                  <AnalysisList title="Strengths" items={application.analysis.strengths} />
                  <AnalysisList title="Concerns" items={application.analysis.concerns} />
                  <div className="rounded-lg border border-border/70 bg-background/45 p-3">
                    <p className="text-sm font-semibold">Experience Summary</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {application.analysis.experienceSummary}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  No AI analysis yet. New candidate submissions are screened automatically.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recruiter Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" disabled={!canInvite} onClick={openScheduleDialog}>
                <CheckCircle2Icon className="size-4" />
                Invite to Technical Interview
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                disabled={!canReject || isRejecting}
                onClick={handleReject}
              >
                {isRejecting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <XCircleIcon className="size-4" />
                )}
                Reject Candidate
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>QCM Assessment</CardTitle>
                {assessmentReport?.attempt && (
                  <Badge variant={assessmentReport.attempt.passed ? "default" : "destructive"}>
                    {assessmentReport.attempt.passed ? "Passed" : "Failed"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!scheduledInterview ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  Schedule a technical interview to activate the candidate QCM gate.
                </p>
              ) : assessmentReport === undefined ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  Loading assessment result
                </div>
              ) : assessmentReport?.attempt ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <AssessmentMetric
                      icon={<ShieldCheckIcon className="size-4 text-primary" />}
                      label="Score"
                    >
                      {assessmentReport.attempt.score ?? 0}%
                    </AssessmentMetric>
                    <AssessmentMetric
                      icon={<CheckCircle2Icon className="size-4 text-emerald-400" />}
                      label="Correct"
                    >
                      {assessmentReport.attempt.correctAnswers ?? 0}/
                      {assessmentReport.attempt.totalQuestions}
                    </AssessmentMetric>
                    <AssessmentMetric
                      icon={<ClockIcon className="size-4 text-accent" />}
                      label="Duration"
                    >
                      {formatAssessmentDuration(
                        assessmentReport.attempt.startedAt,
                        assessmentReport.attempt.submittedAt
                      )}
                    </AssessmentMetric>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-background/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <VideoIcon className="size-4 text-primary" />
                        Camera Recording
                      </p>
                      <Badge variant={assessmentReport.recording?.url ? "secondary" : "outline"}>
                        QCM proctoring
                      </Badge>
                    </div>
                    {assessmentReport.recording?.url ? (
                      <video
                        controls
                        preload="metadata"
                        src={assessmentReport.recording.url}
                        className="mt-3 aspect-video w-full rounded-md border border-border/70 bg-black"
                      />
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No camera recording was saved for this attempt.
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-border/70 bg-background/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Exam Events</p>
                      <Badge
                        variant={assessmentReport.events.length > 0 ? "destructive" : "secondary"}
                      >
                        {assessmentReport.events.length}
                      </Badge>
                    </div>
                    {assessmentReport.events.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {assessmentReport.events.slice(0, 5).map((event: Doc<"assessmentEvents">) => (
                          <div
                            key={event._id}
                            className="flex items-start gap-2 rounded-md border border-border/70 bg-card/50 p-2 text-sm"
                          >
                            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-yellow-500" />
                            <div>
                              <p className="font-medium">{formatAssessmentEvent(event.type)}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(event.createdAt), "MMM d · h:mm:ss a")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No suspicious exam events were recorded.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  The candidate has not started the QCM assessment yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/45 p-3">
                <UserIcon className="size-4 text-primary" />
                <span>Application submitted</span>
              </div>
              {application.status === "technical_invited" && (
                <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <SendIcon className="size-4 text-primary" />
                  <span>Technical interview invitation sent</span>
                </div>
              )}
              {application.status === "cv_rejected" && (
                <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <XCircleIcon className="size-4 text-destructive" />
                  <span>Candidate rejected by CV review</span>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-h-[calc(100vh-80px)] overflow-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Schedule Technical Interview</DialogTitle>
            <DialogDescription>
              Create a Stream interview and email the candidate their invitation link.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleScheduleInterview}>
            <div className="space-y-2">
              <Label htmlFor="interviewTitle">Title</Label>
              <Input
                id="interviewTitle"
                required
                value={scheduleForm.title}
                onChange={(event) =>
                  setScheduleForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interviewDescription">Description</Label>
              <Textarea
                id="interviewDescription"
                rows={3}
                value={scheduleForm.description}
                onChange={(event) =>
                  setScheduleForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label>Date</Label>
                <Calendar
                  mode="single"
                  selected={scheduleForm.date}
                  onSelect={(date) => date && setScheduleForm((prev) => ({ ...prev, date }))}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={getTimeParts(scheduleForm.time).hour}
                    onValueChange={(hour) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        time: setTimePart(prev.time, "hour", hour),
                      }))
                    }
                  >
                    <SelectTrigger className="w-[76px]">
                      <SelectValue placeholder="HH" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      {HOURS_24.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-lg font-semibold text-muted-foreground">:</span>
                  <Select
                    value={getTimeParts(scheduleForm.time).minute}
                    onValueChange={(minute) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        time: setTimePart(prev.time, "minute", minute),
                      }))
                    }
                  >
                    <SelectTrigger className="w-[76px]">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      {MINUTES.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isScheduling}>
                {isScheduling ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
                Send Invitation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/45 p-3">
      <p className="text-sm font-semibold">{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">None detected</p>
      )}
    </div>
  );
}

function formatAssessmentDuration(startedAt?: number, submittedAt?: number) {
  if (!startedAt || !submittedAt) return "--";

  const seconds = Math.max(0, Math.round((submittedAt - startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function formatAssessmentEvent(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function AssessmentMetric({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/45 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold">{children}</p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/45 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words font-semibold">{children}</p>
    </div>
  );
}
