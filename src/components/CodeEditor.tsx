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
  const interview = useQuery(
    api.interviews.getInterviewByStreamCallId,
    streamCallId ? { streamCallId } : "skip"
  );
  const sharedSession = useQuery(
    api.codeSessions.getByStreamCallId,
    streamCallId ? { streamCallId } : "skip"
  );
  const [selectedQuestion, setSelectedQuestion] = useState(CODING_QUESTIONS[0]);
  const [language, setLanguage] = useState<LanguageId>(LANGUAGES[0].id);
  const [code, setCode] = useState(selectedQuestion.starterCode[language]);
  const [now, setNow] = useState(Date.now());
  const [problemStartedAt] = useState(() => Date.now());
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const hasLoadedSharedSession = useRef(false);
  const timerStartTime = interview?.startTime ?? problemStartedAt;
  const timeRemaining = formatTimeRemaining(timerStartTime, now);
  const starterCode = selectedQuestion.starterCode[language];
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

    const question = CODING_QUESTIONS.find((q) => q.id === questionId)!;
    setSelectedQuestion(question);
    setCode(question.starterCode[language]);
    setSubmissionResult(null);
  };

  const handleLanguageChange = (newLanguage: LanguageId) => {
    if (!canEdit) return;

    setLanguage(newLanguage);
    setCode(selectedQuestion.starterCode[newLanguage]);
    setSubmissionResult(null);
  };

  const handleSubmit = () => {
    if (!canEdit) return;

    const expected = selectedQuestion.examples[0]?.output ?? "";
    const result = judgeSubmission(code, language, expected);
    setSubmissionResult(result);

    if (result.status === "accepted") {
      toast.success("Accepted");
    } else {
      toast.error("Wrong Answer");
    }
  };

  useEffect(() => {
    if (sharedSession === undefined) return;

    if (!sharedSession) {
      hasLoadedSharedSession.current = true;
      return;
    }

    if (canEdit && hasLoadedSharedSession.current) return;

    const nextQuestion =
      CODING_QUESTIONS.find((question) => question.id === sharedSession.questionId) ??
      CODING_QUESTIONS[0];
    const nextLanguage = isLanguageId(sharedSession.language) ? sharedSession.language : "javascript";

    setSelectedQuestion(nextQuestion);
    setLanguage(nextLanguage);
    setCode(sharedSession.code);
    hasLoadedSharedSession.current = true;
  }, [canEdit, sharedSession]);

  useEffect(() => {
    if (!canEdit || !streamCallId || sharedSession === undefined) return;
    if (!sharedSession && code.trim() === selectedQuestion.starterCode[language].trim()) return;

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
    <ResizablePanelGroup direction="vertical" className="min-h-[calc-100vh-4rem-1px]">
      {/* QUESTION SECTION */}
      <ResizablePanel>
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {selectedQuestion.title}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {canEdit
                      ? "Choose your language and solve the problem"
                      : "Live read-only view of the candidate workspace"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    {canEdit ? <PencilIcon className="size-4 text-primary" /> : <EyeIcon className="size-4 text-accent" />}
                    {canEdit ? "Candidate editing" : "Interviewer viewing"}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    <ClockIcon className="size-4 text-primary" />
                    Time remaining
                    <span className="font-mono text-sm text-primary">{timeRemaining}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedQuestion.id}
                    onValueChange={handleQuestionChange}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select question" />
                    </SelectTrigger>
                    <SelectContent>
                      {CODING_QUESTIONS.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={language} onValueChange={handleLanguageChange} disabled={!canEdit}>
                    <SelectTrigger className="w-[150px]">
                      {/* SELECT VALUE */}
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          {LANGUAGES.find((l) => l.id === language)?.name}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    {/* SELECT CONTENT */}
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          <div className="flex items-center gap-2">
                            {lang.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {canEdit && (
                    <Button className="gap-2" onClick={handleSubmit}>
                      <SendIcon className="size-4" />
                      Submit
                    </Button>
                  )}
                </div>
              </div>

              {/* PROBLEM DESC. */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <BookIcon className="h-5 w-5 text-primary/80" />
                  <CardTitle>Problem Description</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-line">{selectedQuestion.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* PROBLEM EXAMPLES */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <LightbulbIcon className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-full w-full rounded-md border">
                    <div className="p-4 space-y-4">
                      {selectedQuestion.examples.map((example, index) => (
                        <div key={index} className="space-y-2">
                          <p className="font-medium text-sm">Example {index + 1}:</p>
                          <ScrollArea className="h-full w-full rounded-md">
                            <pre className="bg-muted/50 p-3 rounded-lg text-sm font-mono">
                              <div>Input: {example.input}</div>
                              <div>Output: {example.output}</div>
                              {example.explanation && (
                                <div className="pt-2 text-muted-foreground">
                                  Explanation: {example.explanation}
                                </div>
                              )}
                            </pre>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                    <ScrollBar />
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* CONSTRAINTS */}
              {selectedQuestion.constraints && (
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2">
                    <AlertCircleIcon className="h-5 w-5 text-blue-500" />
                    <CardTitle>Constraints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1.5 text-sm marker:text-muted-foreground">
                      {selectedQuestion.constraints.map((constraint, index) => (
                        <li key={index} className="text-muted-foreground">
                          {constraint}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {canEdit && submissionResult && (
                <Card
                  className={
                    submissionResult.status === "accepted"
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-destructive/50 bg-destructive/10"
                  }
                >
                  <CardHeader className="flex flex-row items-center gap-2">
                    {submissionResult.status === "accepted" ? (
                      <CheckCircle2Icon className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-destructive" />
                    )}
                    <CardTitle>
                      {submissionResult.status === "accepted" ? "Accepted" : "Wrong Answer"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{submissionResult.message}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md border border-border/70 bg-background/60 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Expected
                        </p>
                        <pre className="mt-1 whitespace-pre-wrap font-mono">
                          {submissionResult.expected}
                        </pre>
                      </div>
                      <div className="rounded-md border border-border/70 bg-background/60 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Received
                        </p>
                        <pre className="mt-1 whitespace-pre-wrap font-mono">
                          {submissionResult.received ?? "No output detected"}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          <ScrollBar />
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* CODE EDITOR */}
      <ResizablePanel defaultSize={60} maxSize={100}>
        <div className="h-full relative">
          <Editor
            height={"100%"}
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
              fontSize: 18,
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
  );
}
export default CodeEditor;
