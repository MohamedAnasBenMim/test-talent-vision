"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  LockIcon,
  RadioIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import toast from "react-hot-toast";

type AssessmentGateProps = {
  streamCallId: string;
  onCompleted: () => void;
};

type ExamEventType =
  | "fullscreen_left"
  | "tab_hidden"
  | "window_blur"
  | "copy_blocked"
  | "paste_blocked"
  | "context_menu_blocked"
  | "auto_submit";

type AssessmentAnswer = {
  questionId: string;
  selectedOptionId: string;
};

function formatTimer(expiresAt?: number) {
  if (!expiresAt) return "15:00";

  const remainingMs = Math.max(0, expiresAt - Date.now());
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(startedAt?: number, submittedAt?: number) {
  if (!startedAt || !submittedAt) return "--";

  const seconds = Math.max(0, Math.round((submittedAt - startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

async function requestFullscreenMode() {
  if (typeof document === "undefined" || document.fullscreenElement) return;

  try {
    await document.documentElement.requestFullscreen();
  } catch {
    toast.error("Fullscreen could not be enabled. Continue without leaving the exam page.");
  }
}

export default function AssessmentGate({ streamCallId, onCompleted }: AssessmentGateProps) {
  const examState = useQuery(
    api.assessments.getExamState,
    streamCallId ? { streamCallId } : "skip"
  );
  const startAttempt = useMutation(api.assessments.startAttempt);
  const saveAnswer = useMutation(api.assessments.saveAnswer);
  const submitAttempt = useMutation(api.assessments.submitAttempt);
  const logEvent = useMutation(api.assessments.logEvent);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const localWarningCount = useRef(0);
  const lastEventAt = useRef<Partial<Record<ExamEventType, number>>>({});
  const autoSubmitTriggered = useRef(false);

  const attempt = examState?.attempt;
  const isInProgress = attempt?.status === "in_progress";
  const isSubmitted = attempt?.status === "submitted" || attempt?.status === "auto_submitted";

  const answeredCount = useMemo(() => {
    return Object.keys(answers).filter((questionId) => Boolean(answers[questionId])).length;
  }, [answers]);

  const warningCount = (examState?.warningCount ?? 0) + localWarningCount.current;

  useEffect(() => {
    if (!attempt) return;

    setAnswers(
      Object.fromEntries(
        attempt.answers.map((answer: AssessmentAnswer) => [
          answer.questionId,
          answer.selectedOptionId,
        ])
      )
    );
  }, [attempt]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const submit = async (autoSubmitted = false) => {
    if (!isInProgress || isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (autoSubmitted) {
        await logEvent({
          streamCallId,
          type: "auto_submit",
          message: "Assessment was submitted automatically.",
        });
      }

      await submitAttempt({ streamCallId, autoSubmitted });
      toast.success(autoSubmitted ? "Assessment auto-submitted" : "Assessment submitted");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const recordEvent = async (type: ExamEventType, message: string) => {
    if (!isInProgress || autoSubmitTriggered.current) return;

    const currentTime = Date.now();
    const lastTime = lastEventAt.current[type] ?? 0;
    if (currentTime - lastTime < 1500) return;

    lastEventAt.current[type] = currentTime;
    localWarningCount.current += 1;

    try {
      await logEvent({ streamCallId, type, message });
    } catch (error) {
      console.error("Failed to log assessment event:", error);
    }

    toast.error(message);

    const nextWarnings = (examState?.warningCount ?? 0) + localWarningCount.current;
    if (nextWarnings >= (examState?.maxWarningsBeforeAutoSubmit ?? 3)) {
      autoSubmitTriggered.current = true;
      void submit(true);
    }
  };

  useEffect(() => {
    if (!isInProgress || !attempt?.expiresAt) return;
    if (now < attempt.expiresAt || autoSubmitTriggered.current) return;

    autoSubmitTriggered.current = true;
    void submit(true);
  }, [attempt?.expiresAt, isInProgress, now]);

  useEffect(() => {
    if (!isInProgress) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void recordEvent("tab_hidden", "Leaving the exam tab was recorded.");
      }
    };

    const handleBlur = () => {
      void recordEvent("window_blur", "Leaving the exam window was recorded.");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        void recordEvent("fullscreen_left", "Leaving fullscreen was recorded.");
      }
    };

    const blockCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      void recordEvent("copy_blocked", "Copy is disabled during the assessment.");
    };

    const blockPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      void recordEvent("paste_blocked", "Paste is disabled during the assessment.");
    };

    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      void recordEvent("context_menu_blocked", "Context menu is disabled during the assessment.");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("copy", blockCopy);
    window.addEventListener("paste", blockPaste);
    window.addEventListener("contextmenu", blockContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("copy", blockCopy);
      window.removeEventListener("paste", blockPaste);
      window.removeEventListener("contextmenu", blockContextMenu);
    };
  }, [isInProgress, examState?.warningCount]);

  const handleStart = async () => {
    setIsStarting(true);

    try {
      await requestFullscreenMode();
      await startAttempt({ streamCallId });
      toast.success("Assessment started");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to start assessment");
    } finally {
      setIsStarting(false);
    }
  };

  const handleAnswer = async (questionId: string, selectedOptionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOptionId }));

    try {
      await saveAnswer({ streamCallId, questionId, selectedOptionId });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save answer");
    }
  };

  if (examState === undefined) return <LoaderUI />;

  if (examState.accessDenied) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-background px-4 py-8">
        <section className="w-full max-w-2xl rounded-lg border border-border/70 bg-card/85 p-8 text-center shadow-sm shadow-black/20">
          <div className="mx-auto grid size-14 place-items-center rounded-md border border-destructive/30 bg-destructive/10">
            <LockIcon className="size-7 text-destructive" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Assessment Access Restricted</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            This interview link is assigned to a specific candidate account. Sign in with the same
            email address that received the invitation, then open the link again.
          </p>
        </section>
      </main>
    );
  }

  if (!attempt) {
    return (
      <main className="fixed inset-0 z-50 overflow-auto bg-background px-4 py-8">
        <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-border/70 bg-card/85 p-6 shadow-sm shadow-black/20">
            <div className="grid size-14 place-items-center rounded-md border border-primary/25 bg-primary/10">
              <ShieldCheckIcon className="size-7 text-primary" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Isolated Assessment
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Technical QCM Gate</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Complete this controlled multiple-choice assessment before entering the interview
              room. Your answers and exam events are saved automatically.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assessment Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <RuleTile icon={<ClockIcon className="size-5 text-primary" />} label="Duration">
                  {Math.round(examState.durationMs / 60000)} minutes
                </RuleTile>
                <RuleTile icon={<RadioIcon className="size-5 text-accent" />} label="Questions">
                  {examState.questions.length} QCM
                </RuleTile>
                <RuleTile icon={<CheckCircle2Icon className="size-5 text-emerald-400" />} label="Pass score">
                  {examState.passScore}%
                </RuleTile>
              </div>

              <div className="rounded-lg border border-border/70 bg-background/50 p-4 text-sm leading-6 text-muted-foreground">
                Stay in fullscreen, keep this tab active, and answer without copying or pasting.
                Repeated violations can automatically submit the assessment.
              </div>

              <Button className="w-full gap-2" size="lg" onClick={handleStart} disabled={isStarting}>
                {isStarting ? (
                  <ClockIcon className="size-4 animate-spin" />
                ) : (
                  <LockIcon className="size-4" />
                )}
                Start Assessment
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (isSubmitted) {
    const passed = Boolean(attempt.passed);

    return (
      <main className="fixed inset-0 z-50 overflow-auto bg-background px-4 py-8">
        <section className="mx-auto max-w-3xl rounded-lg border border-border/70 bg-card/85 p-6 text-center shadow-sm shadow-black/20">
          <div
            className={
              passed
                ? "mx-auto grid size-14 place-items-center rounded-md border border-emerald-500/30 bg-emerald-500/10"
                : "mx-auto grid size-14 place-items-center rounded-md border border-destructive/30 bg-destructive/10"
            }
          >
            {passed ? (
              <CheckCircle2Icon className="size-7 text-emerald-400" />
            ) : (
              <XCircleIcon className="size-7 text-destructive" />
            )}
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Assessment Submitted</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {passed
              ? "You passed the QCM gate and can continue to the interview room."
              : "Your QCM score did not reach the required threshold. The recruiting team can review your result."}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <ResultTile label="Score">{attempt.score ?? 0}%</ResultTile>
            <ResultTile label="Correct">
              {attempt.correctAnswers ?? 0}/{attempt.totalQuestions}
            </ResultTile>
            <ResultTile label="Duration">
              {formatDuration(attempt.startedAt, attempt.submittedAt)}
            </ResultTile>
          </div>

          {passed ? (
            <Button className="mt-6 w-full" size="lg" onClick={onCompleted}>
              Enter Interview Room
            </Button>
          ) : (
            <Badge className="mt-6" variant="destructive">
              Interview locked
            </Badge>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 overflow-auto bg-background px-4 py-6">
      <section className="mx-auto max-w-6xl">
        <div className="sticky top-0 z-30 mb-5 rounded-lg border border-border/70 bg-card/95 p-4 shadow-sm shadow-black/20 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Isolated Assessment
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Technical QCM</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {answeredCount}/{examState.questions.length} answered
              </Badge>
              <Badge variant={warningCount > 0 ? "destructive" : "secondary"}>
                {warningCount} warnings
              </Badge>
              <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-2 font-mono text-lg font-semibold text-primary">
                <ClockIcon className="size-4" />
                {formatTimer(attempt.expiresAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {examState.questions.map((question, questionIndex) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="flex gap-3 text-lg">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-sm text-primary">
                    {questionIndex + 1}
                  </span>
                  {question.prompt}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={
                        selected
                          ? "flex items-center gap-3 rounded-lg border border-primary bg-primary/10 p-4 text-left transition-colors"
                          : "flex items-center gap-3 rounded-lg border border-border/70 bg-background/50 p-4 text-left transition-colors hover:border-primary/40"
                      }
                      onClick={() => handleAnswer(question.id, option.id)}
                    >
                      <span
                        className={
                          selected
                            ? "grid size-5 shrink-0 place-items-center rounded-full border border-primary bg-primary"
                            : "grid size-5 shrink-0 place-items-center rounded-full border border-muted-foreground"
                        }
                      >
                        {selected && <span className="size-2 rounded-full bg-primary-foreground" />}
                      </span>
                      <span className="text-sm leading-6">{option.label}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-border/70 bg-card/85 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangleIcon className="size-4 text-yellow-500" />
            Submit only when you are ready. You cannot restart this attempt.
          </div>
          <Button
            className="gap-2"
            disabled={answeredCount === 0 || isSubmitting}
            onClick={() => submit(false)}
          >
            {isSubmitting ? (
              <ClockIcon className="size-4 animate-spin" />
            ) : (
              <CheckCircle2Icon className="size-4" />
            )}
            Submit Assessment
          </Button>
        </div>
      </section>
    </main>
  );
}

function RuleTile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/50 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-semibold">{children}</p>
    </div>
  );
}

function ResultTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{children}</p>
    </div>
  );
}
