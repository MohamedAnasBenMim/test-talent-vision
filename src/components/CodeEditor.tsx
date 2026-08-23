import { CODING_QUESTIONS, LANGUAGES, LanguageId } from "@/constants";
import { useEffect, useRef, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  AlertCircleIcon,
  BookIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  LightbulbIcon,
  PencilIcon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { useUser } from "@clerk/nextjs";
import { useCall } from "@stream-io/video-react-sdk";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUserRole } from "@/hooks/useUserRole";
import toast from "react-hot-toast";

function isLanguageId(language: string): language is LanguageId {
  return LANGUAGES.some((item) => item.id === language);
}

const PROBLEM_DURATION_MS = 10 * 60 * 1000;

type SubmissionResult = {
  status: "accepted" | "wrong";
  message: string;
  expected: string;
  received?: string;
};

function formatTimeRemaining(startTime?: number, now = Date.now()) {
  if (!startTime) return "Not scheduled";

  const endTime = startTime + PROBLEM_DURATION_MS;
  const remainingMs = Math.max(0, endTime - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (remainingMs === 0) return "Time ended";

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function readStringLiterals(source: string) {
  const literals: string[] = [];
  const regex = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    literals.push(
      match[2]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\")
    );
  }

  return literals;
}

function extractPrintedOutput(source: string, language: LanguageId) {
  const outputParts: string[] = [];
  const patterns: Partial<Record<LanguageId, RegExp[]>> = {
    javascript: [
      /\bconsole\.log\s*\(([^)]*)\)/g,
      /\bprocess\.stdout\.write\s*\(([^)]*)\)/g,
      /\bdocument\.write\s*\(([^)]*)\)/g,
    ],
    python: [/\bprint\s*\(([^)]*)\)/g],
    java: [/\bSystem\.out\.print(?:ln)?\s*\(([^)]*)\)/g],
    cpp: [/(?:std::)?cout\s*<<([^;]+)/g],
  };

  for (const pattern of patterns[language] ?? []) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(source)) !== null) {
      outputParts.push(...readStringLiterals(match[1]));
    }
  }

  return outputParts.join("");
}

function findSyntaxIssue(source: string, language: LanguageId) {
  if (language !== "cpp" && language !== "java") return null;

  const lines = source.split("\n");

  for (const line of lines) {
    const statement = line.split("//")[0].trim();
    const hasPrintStatement =
      language === "cpp"
        ? /\b(?:std::)?cout\s*<</.test(statement)
        : /\bSystem\.out\.print(?:ln)?\s*\(/.test(statement);

    if (hasPrintStatement && !statement.endsWith(";")) {
      return "Compilation Error: missing semicolon after the print statement.";
    }
  }

  return null;
}

function judgeSubmission(source: string, language: LanguageId, expected: string): SubmissionResult {
  if (!source.trim()) {
    return {
      status: "wrong",
      message: "Wrong Answer: your editor is empty.",
      expected,
    };
  }

  const syntaxIssue = findSyntaxIssue(source, language);

  if (syntaxIssue) {
    return {
      status: "wrong",
      message: syntaxIssue,
      expected,
    };
  }

  const received = extractPrintedOutput(source, language).trimEnd();

  if (received === expected) {
    return {
      status: "accepted",
      message: "Accepted: output matches the expected result.",
      expected,
      received,
    };
  }

  return {
    status: "wrong",
    message: received
      ? "Wrong Answer: the printed output does not match."
      : "Wrong Answer: no printable output was detected.",
    expected,
    received: received || undefined,
  };
}

function CodeEditor() {
  const call = useCall();
  const { user } = useUser();
  const { isCandidate, isInterviewer, isLoading: isRoleLoading } = useUserRole();
  const streamCallId = call?.id ?? "";
  const upsertCodeSession = useMutation(api.codeSessions.upsert);
  const updateInterviewStatus = useMutation(api.interviews.updateInterviewStatus);
  const interview = useQuery(
    api.interviews.getInterviewByStreamCallId,
    streamCallId ? { streamCallId } : "skip"
  );
  const jobForCall = useQuery(
    api.interviews.getJobForStreamCall,
    streamCallId ? { streamCallId } : "skip"
  );
  const sharedSession = useQuery(
    api.codeSessions.getByStreamCallId,
    streamCallId ? { streamCallId } : "skip"
  );

  const availableQuestions = jobForCall?.codingQuestion
    ? [jobForCall.codingQuestion, ...CODING_QUESTIONS]
    : CODING_QUESTIONS;

  const [selectedQuestion, setSelectedQuestion] = useState<any>(CODING_QUESTIONS[0]);
  const [language, setLanguage] = useState<LanguageId>(LANGUAGES[0].id);
  const [code, setCode] = useState(selectedQuestion.starterCode[language]);
  const [now, setNow] = useState(Date.now());
  const [problemStartedAt] = useState(() => Date.now());
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLoadedSharedSession = useRef(false);
  const hasLoadedJobQuestion = useRef(false);
  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    if (!jobForCall?.codingQuestion || hasLoadedJobQuestion.current || sharedSession) return;

    const customQ = jobForCall.codingQuestion;
    setSelectedQuestion(customQ);
    setCode(customQ.starterCode?.[language] || customQ.starterCode?.javascript || "");
    hasLoadedJobQuestion.current = true;
  }, [jobForCall, language, sharedSession]);

  const timerStartTime = interview?.startTime ?? problemStartedAt;
  const timeRemaining = formatTimeRemaining(timerStartTime, now);
  const starterCode = selectedQuestion.starterCode?.[language] || "";
  const hasCandidateInput = code.trim() !== "" && code.trim() !== starterCode.trim();
  const reviewerCode = hasCandidateInput ? code : "";
  const userEmail = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();

  const canEdit =
    Boolean(user?.id) &&
    Boolean(isCandidate) &&
    (interview === null ||
      (interview !== undefined &&
        (interview.candidateId === user?.id ||
          Boolean(userEmail && interview.candidateId.toLowerCase() === userEmail) ||
          Boolean(userEmail && interview.candidateEmail?.toLowerCase() === userEmail))));

  const isReviewerView = !isRoleLoading && (isInterviewer || !canEdit);

  const handleQuestionChange = (questionId: string) => {
    if (!canEdit) return;

    const question = availableQuestions.find((q) => q.id === questionId)!;
    setSelectedQuestion(question);
    setCode(question.starterCode?.[language] || "");
    setSubmissionResult(null);
  };

  const handleLanguageChange = (newLanguage: LanguageId) => {
    if (!canEdit) return;

    setLanguage(newLanguage);
    setCode(selectedQuestion.starterCode?.[newLanguage] || "");
    setSubmissionResult(null);
  };

  const handleSubmitTest = () => {
    if (!canEdit) return;

    const expected = selectedQuestion.examples[0]?.output ?? "";
    const result = judgeSubmission(code, language, expected);
    setSubmissionResult(result);

    if (result.status === "accepted") {
      toast.success("Test Accepted!");
    } else {
      toast.error("Test Failed — Output does not match");
    }
  };

  const handleFinishAssessment = async () => {
    if (!canEdit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const expected = selectedQuestion.examples[0]?.output ?? "";
      const result = judgeSubmission(code, language, expected);
      setSubmissionResult(result);

      if (streamCallId) {
        await upsertCodeSession({
          streamCallId,
          interviewId: interview ? interview._id : undefined,
          code,
          language,
          questionId: selectedQuestion.id,
        });
      }

      if (interview?._id) {
        await updateInterviewStatus({ id: interview._id, status: "completed" });
      }

      if (call) {
        await call.leave();
      }

      toast.success("Assessment submitted successfully! Thank you.");
      window.location.href = "/";
    } catch (error) {
      console.error("Error completing assessment:", error);
      toast.error("Failed to submit assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-submit when time expires
  useEffect(() => {
    if (timeRemaining === "Time ended" && canEdit && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      toast("Time expired! Automatically submitting your assessment...", { icon: "⏳" });
      void handleFinishAssessment();
    }
  }, [timeRemaining, canEdit]);

  useEffect(() => {
    if (sharedSession === undefined) return;

    if (!sharedSession) {
      hasLoadedSharedSession.current = true;
      return;
    }

    if (canEdit && hasLoadedSharedSession.current) return;

    const nextQuestion =
      availableQuestions.find((question) => question.id === sharedSession.questionId) ??
      availableQuestions[0];
    const nextLanguage = isLanguageId(sharedSession.language) ? sharedSession.language : "javascript";

    setSelectedQuestion(nextQuestion);
    setLanguage(nextLanguage);
    setCode(sharedSession.code);
    hasLoadedSharedSession.current = true;
  }, [availableQuestions, canEdit, sharedSession]);

  useEffect(() => {
    if (!canEdit || !streamCallId || sharedSession === undefined) return;
    if (!sharedSession && code.trim() === (selectedQuestion.starterCode?.[language] || "").trim()) return;

    const timeout = window.setTimeout(() => {
      void upsertCodeSession({
        streamCallId,
        interviewId: interview ? interview._id : undefined,
        code,
        language,
        questionId: selectedQuestion.id,
      }).catch((error) => {
        console.error("Failed to sync shared code session:", error);
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [
    canEdit,
    code,
    interview,
    language,
    selectedQuestion.id,
    sharedSession,
    streamCallId,
    upsertCodeSession,
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (isReviewerView) {
    return (
      <div className="flex h-full min-h-0 flex-col border-l border-border/70 bg-background">
        <div className="flex items-center justify-between gap-4 border-b border-border/70 bg-card/70 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Supervision Mode
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Live Candidate Code</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Read-only stream of the candidate editor.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <EyeIcon className="size-4 text-accent" />
              Read-only
            </div>
            <div className="rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm font-medium">
              {LANGUAGES.find((l) => l.id === language)?.name}
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-border/70 bg-background/70 px-5 py-4 md:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">Problem</p>
            <p className="mt-1 font-semibold">{selectedQuestion.title}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/60 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" />
              Time remaining
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-primary">{timeRemaining}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">Sync status</p>
            <p className="mt-1 font-semibold text-accent">
              {hasCandidateInput ? "Receiving code" : "Waiting for candidate input"}
            </p>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          {!hasCandidateInput && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-lg border border-border/70 bg-background/85 px-5 py-4 text-center shadow-lg shadow-black/20 backdrop-blur">
                <p className="font-semibold">Waiting for candidate input</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Code will appear here once the candidate starts writing.
                </p>
              </div>
            </div>
          )}
          <Editor
            height="100%"
            defaultLanguage={language}
            language={language}
            theme="vs-dark"
            value={reviewerCode}
            options={{
              readOnly: true,
              minimap: { enabled: true },
              fontSize: 18,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 18, bottom: 18 },
              wordWrap: "on",
              wrappingIndent: "indent",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* TOP HEADER CONTROLS TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-card/60 px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BookIcon className="size-4 text-primary" />
            <h2 className="text-base font-bold tracking-tight">
              {selectedQuestion.title}
            </h2>
          </div>

          <Select
            value={selectedQuestion.id}
            onValueChange={handleQuestionChange}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue placeholder="Select question" />
            </SelectTrigger>
            <SelectContent>
              {availableQuestions.map((q) => (
                <SelectItem key={q.id} value={q.id} className="text-xs">
                  {q.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {canEdit ? <PencilIcon className="size-3.5 text-primary" /> : <EyeIcon className="size-3.5 text-accent" />}
            {canEdit ? "Candidate editing" : "Interviewer viewing"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* TIMER */}
          <div className="inline-flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
            <ClockIcon className="size-3.5 text-purple-500 animate-pulse" />
            <span>Time remaining:</span>
            <span className="font-mono text-sm font-bold">{timeRemaining}</span>
          </div>

          {/* LANGUAGE SELECTOR */}
          <Select value={language} onValueChange={handleLanguageChange} disabled={!canEdit}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue>
                <div className="flex items-center gap-2 text-xs">
                  {LANGUAGES.find((l) => l.id === language)?.name}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.id} value={lang.id} className="text-xs">
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ACTION BUTTONS */}
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-semibold" onClick={handleSubmitTest}>
                <PencilIcon className="size-3.5 text-primary" />
                Run Test
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={handleFinishAssessment}
                disabled={isSubmitting}
              >
                <CheckCircle2Icon className="size-3.5" />
                {isSubmitting ? "Submitting..." : "Submit & Finish Assessment"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN SIDE-BY-SIDE SIDEBAR & EDITOR WORKSPACE */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal">
          {/* LEFT PANEL: PROBLEM STATEMENT & EXAMPLES */}
          <ResizablePanel defaultSize={42} minSize={30} maxSize={55} className="border-r border-border/70 bg-card/30">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-5 max-w-3xl">
                {/* PROBLEM DESCRIPTION */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                    <BookIcon className="size-4" />
                    Problem Description
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-foreground/90">
                    <p className="whitespace-pre-line">{selectedQuestion.description}</p>
                  </div>
                </div>

                {/* PROBLEM EXAMPLES */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                    <LightbulbIcon className="size-4" />
                    Examples
                  </div>
                  <div className="space-y-3">
                    {(selectedQuestion.examples || []).map((example: any, index: number) => (
                      <div key={index} className="rounded-lg border border-border/70 bg-background/80 p-3 space-y-2 text-xs">
                        <p className="font-semibold text-primary">Example {index + 1}:</p>
                        <div className="bg-slate-950 text-slate-100 p-3 rounded-md font-mono space-y-1 text-[11px] overflow-x-auto border border-border/50">
                          <div><span className="text-slate-400 font-sans">Input:</span> {example.input}</div>
                          <div><span className="text-slate-400 font-sans">Output:</span> {example.output}</div>
                          {example.explanation && (
                            <div className="pt-1 text-slate-400 font-sans border-t border-slate-800 mt-1">
                              Explanation: {example.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CONSTRAINTS */}
                {selectedQuestion.constraints && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-500">
                      <AlertCircleIcon className="size-4" />
                      Constraints
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/70">
                      {(selectedQuestion.constraints || []).map((constraint: any, index: number) => (
                        <li key={index} className="leading-relaxed">
                          {constraint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* SUBMISSION RESULT FEEDBACK */}
                {canEdit && submissionResult && (
                  <Card
                    className={
                      submissionResult.status === "accepted"
                        ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm"
                        : "border-destructive/50 bg-destructive/10 shadow-sm"
                    }
                  >
                    <CardHeader className="p-3 pb-2 flex flex-row items-center gap-2">
                      {submissionResult.status === "accepted" ? (
                        <CheckCircle2Icon className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-destructive" />
                      )}
                      <CardTitle className="text-sm font-bold">
                        {submissionResult.status === "accepted" ? "Accepted — All Tests Passed" : "Execution Result"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2 text-xs">
                      <p className="text-muted-foreground font-medium">{submissionResult.message}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border border-border/70 bg-background/80 p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Expected Output
                          </p>
                          <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px]">
                            {submissionResult.expected}
                          </pre>
                        </div>
                        <div className="rounded-md border border-border/70 bg-background/80 p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Your Output
                          </p>
                          <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px]">
                            {submissionResult.received ?? "No output detected"}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <ScrollBar />
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT PANEL: FULL-HEIGHT MONACO CODE EDITOR */}
          <ResizablePanel defaultSize={58} minSize={45}>
            <div className="h-full relative bg-slate-950">
              <Editor
                height="100%"
                defaultLanguage={language}
                language={language}
                theme="vs-dark"
                value={code}
                onChange={(value) => {
                  if (!canEdit) return;
                  setCode(value || "");
                  setSubmissionResult(null);
                }}
                options={{
                  readOnly: !canEdit,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  wordWrap: "on",
                  wrappingIndent: "indent",
                }}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default CodeEditor;
