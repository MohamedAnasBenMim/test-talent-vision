"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import LoaderUI from "@/components/LoaderUI";
import FormattedMarkdown from "@/components/ui/formatted-markdown";
import { joinList, normalizeOptional, slugifyJobId, splitList } from "@/components/jobs/jobUtils";
import {
  SparklesIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  SaveIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CodeIcon,
  HelpCircleIcon,
  CheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type JobEditorProps = {
  jobId?: string;
};

type JobStatus = "draft" | "published" | "closed";

export default function JobEditor({ jobId }: JobEditorProps) {
  const router = useRouter();
  const existingJob = useQuery(
    api.applications.getJobByJobId,
    jobId ? { jobId } : "skip"
  );
  const upsertJobRequirements = useMutation(api.applications.upsertJobRequirements);
  const generateAction = useAction((api as any).jobGeneration?.generateJobDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQuestionDetails, setShowQuestionDetails] = useState(false);
  const [qcmQuestions, setQcmQuestions] = useState<any[]>([]);
  const [codingQuestion, setCodingQuestion] = useState<any>(null);
  const [form, setForm] = useState({
    jobId: jobId ?? "",
    title: "",
    description: "",
    location: "",
    contractType: "",
    requiredSkills: "",
    niceToHaveSkills: "",
    minimumExperience: "",
    languages: "",
    education: "",
    status: "published" as JobStatus,
  });

  useEffect(() => {
    if (!existingJob) return;

    setForm({
      jobId: existingJob.jobId,
      title: existingJob.title,
      description: existingJob.description,
      location: existingJob.location ?? "",
      contractType: existingJob.contractType ?? "",
      requiredSkills: joinList(existingJob.requiredSkills),
      niceToHaveSkills: joinList(existingJob.niceToHaveSkills),
      minimumExperience: existingJob.minimumExperience ?? "",
      languages: joinList(existingJob.languages),
      education: existingJob.education ?? "",
      status: existingJob.status ?? "published",
    });

    if (existingJob.qcmQuestions) {
      setQcmQuestions(existingJob.qcmQuestions);
    }
    if (existingJob.codingQuestion) {
      setCodingQuestion(existingJob.codingQuestion);
    }
  }, [existingJob]);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined" || !form.jobId) return "";
    return `${window.location.origin}/jobs/${form.jobId}`;
  }, [form.jobId]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "title" && !jobId && (!prev.jobId || prev.jobId === slugifyJobId(prev.title))) {
        next.jobId = slugifyJobId(value);
      }

      return next;
    });
  };

  const copyPublicLink = async () => {
    if (!publicUrl) return;

    await navigator.clipboard.writeText(publicUrl);
    toast.success("Public job link copied");
  };

  const handleGenerateAI = async () => {
    if (!form.title) {
      toast.error("Please enter a Job title first");
      return;
    }
    
    setIsGenerating(true);
    try {
      const result = await generateAction({ title: form.title });
      
      setForm(prev => ({
        ...prev,
        description: result.description || prev.description,
        requiredSkills: result.requiredSkills || prev.requiredSkills,
        niceToHaveSkills: result.niceToHaveSkills || prev.niceToHaveSkills,
        minimumExperience: result.minimumExperience || prev.minimumExperience,
        languages: result.languages || prev.languages,
        education: result.education || prev.education,
      }));

      if (result.qcmQuestions && Array.isArray(result.qcmQuestions)) {
        setQcmQuestions(result.qcmQuestions);
      }
      if (result.codingQuestion) {
        setCodingQuestion(result.codingQuestion);
      }

      toast.success("Job description, QCM assessment & coding test generated with AI!");
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to generate with AI: ${error?.message || error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedJobId = slugifyJobId(form.jobId || form.title);

    if (!normalizedJobId || !form.title.trim() || !form.description.trim()) {
      toast.error("Add a title, job ID, and job description");
      return;
    }

    const requiredSkills = splitList(form.requiredSkills);
    if (requiredSkills.length === 0) {
      toast.error("Add at least one required skill");
      return;
    }

    setIsSaving(true);

    try {
      await upsertJobRequirements({
        jobId: normalizedJobId,
        title: form.title.trim(),
        description: form.description.trim(),
        location: normalizeOptional(form.location),
        contractType: normalizeOptional(form.contractType),
        requiredSkills,
        niceToHaveSkills: splitList(form.niceToHaveSkills),
        minimumExperience: normalizeOptional(form.minimumExperience),
        languages: splitList(form.languages),
        education: normalizeOptional(form.education),
        status: form.status,
        qcmQuestions: qcmQuestions.length > 0 ? qcmQuestions : undefined,
        codingQuestion: codingQuestion || undefined,
      });

      toast.success("Job saved with technical assessment & coding test!");
      router.push(`/dashboard/jobs/${normalizedJobId}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save job");
    } finally {
      setIsSaving(false);
    }
  };

  if (jobId && existingJob === undefined) return <LoaderUI />;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{jobId ? "Job Setup" : "Create Job Post"}</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            The AI ranking uses this job description and requirement profile for every application.
          </p>
        </div>
        <Badge variant={form.status === "published" ? "default" : "outline"}>
          {form.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Job title</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs" 
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !form.title}
                >
                  {isGenerating ? (
                    <Loader2Icon className="mr-1 size-3 animate-spin" />
                  ) : (
                    <SparklesIcon className="mr-1 size-3 text-purple-500" />
                  )}
                  Generate with AI
                </Button>
              </div>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Full-Stack React JS / Python & IA"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobId">Public job ID</Label>
              <Input
                id="jobId"
                value={form.jobId}
                onChange={(event) => updateField("jobId", slugifyJobId(event.target.value))}
                placeholder="fullstack-react-python-ai"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="Boumhal, Tunis"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractType">Contract</Label>
              <Input
                id="contractType"
                value={form.contractType}
                onChange={(event) => updateField("contractType", event.target.value)}
                placeholder="CDI"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(status: JobStatus) => updateField("status", status)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-sm font-bold text-foreground">
                Full Job Description (Markdown Supported)
              </Label>
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider hidden sm:inline-block">
                Parallel Split Editor & Live Preview
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 items-stretch">
              {/* Left Column: Markdown Input Editor */}
              <div className="space-y-1.5 flex flex-col">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-medium">
                  <span>Markdown Code Editor</span>
                  <span className="text-[10px] text-muted-foreground">Type or paste below</span>
                </div>
                <Textarea
                  id="description"
                  rows={14}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Write or paste your job description using Markdown..."
                  className="font-mono text-xs leading-relaxed resize-y h-full min-h-[320px]"
                  required
                />
              </div>

              {/* Right Column: Parallel Live Preview */}
              <div className="rounded-xl border border-border/80 bg-secondary/15 p-4.5 flex flex-col min-h-[320px] max-h-[550px] overflow-y-auto">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/60 shrink-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Description Preview
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">Real-Time Sync</span>
                </div>
                {form.description ? (
                  <FormattedMarkdown content={form.description} />
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground py-12 space-y-1">
                    <p className="text-xs italic">Type on the left or generate with AI to view live preview...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="requiredSkills">Required skills</Label>
              <Input
                id="requiredSkills"
                value={form.requiredSkills}
                onChange={(event) => updateField("requiredSkills", event.target.value)}
                placeholder="React, Python, Django, REST APIs"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="niceToHaveSkills">Nice-to-have skills</Label>
              <Input
                id="niceToHaveSkills"
                value={form.niceToHaveSkills}
                onChange={(event) => updateField("niceToHaveSkills", event.target.value)}
                placeholder="TensorFlow, PyTorch, Gemini API"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="minimumExperience">Experience</Label>
              <Input
                id="minimumExperience"
                value={form.minimumExperience}
                onChange={(event) => updateField("minimumExperience", event.target.value)}
                placeholder="2+ years"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="languages">Languages</Label>
              <Input
                id="languages"
                value={form.languages}
                onChange={(event) => updateField("languages", event.target.value)}
                placeholder="English intermediate, French good level"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="education">Education</Label>
              <Input
                id="education"
                value={form.education}
                onChange={(event) => updateField("education", event.target.value)}
                placeholder="Bac+4/5 Computer Science"
              />
            </div>
          </div>

          {(qcmQuestions.length > 0 || codingQuestion) && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-purple-400" />
                  <h4 className="font-semibold text-sm">AI-Generated Job Assessments</h4>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuestionDetails(!showQuestionDetails)}
                  className="h-8 gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                >
                  <EyeIcon className="size-3.5" />
                  {showQuestionDetails ? "Hide Questions" : "View Questions & Answer Key"}
                  {showQuestionDetails ? (
                    <ChevronUpIcon className="size-3.5" />
                  ) : (
                    <ChevronDownIcon className="size-3.5" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Candidates applying for this position will automatically take these tailored assessment questions.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                  <p className="font-semibold text-primary flex items-center gap-1.5">
                    <HelpCircleIcon className="size-3.5" />
                    QCM Technical Assessment
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {qcmQuestions.length} tailored multiple-choice questions
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                  <p className="font-semibold text-primary flex items-center gap-1.5">
                    <CodeIcon className="size-3.5" />
                    Technical Coding Challenge
                  </p>
                  <p className="mt-1 text-muted-foreground font-medium">
                    {codingQuestion?.title ?? "Tailored coding question ready"}
                  </p>
                </div>
              </div>

              {showQuestionDetails && (
                <div className="space-y-4 pt-3 border-t border-purple-500/20 animate-in fade-in duration-200">
                  {/* QCM Questions Details */}
                  {qcmQuestions.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <HelpCircleIcon className="size-4" />
                        Generated QCM Questions ({qcmQuestions.length})
                      </h5>
                      <div className="space-y-3">
                        {qcmQuestions.map((q, idx) => {
                          const questionText = q.prompt || q.question || `Question ${idx + 1}`;
                          return (
                            <div
                              key={q.id || idx}
                              className="rounded-xl border border-border/80 bg-card p-3.5 text-xs space-y-2 shadow-2xs"
                            >
                              <p className="font-semibold text-foreground">
                                <span className="text-primary font-bold mr-1">Q{idx + 1}:</span>
                                {questionText}
                              </p>
                              <div className="grid gap-1.5 pl-3 pt-1">
                                {q.options?.map((opt: any, optIdx: number) => {
                                  const optionText = typeof opt === "object" && opt !== null ? opt.label || opt.text || JSON.stringify(opt) : String(opt);
                                  const optionId = typeof opt === "object" && opt !== null && opt.id ? String(opt.id).toLowerCase() : String.fromCharCode(65 + optIdx).toLowerCase();
                                  const isCorrect =
                                    (q.correctOptionId && String(q.correctOptionId).toLowerCase() === optionId) ||
                                    q.correctAnswer === optIdx ||
                                    String(q.correctAnswer) === optionId;

                                  return (
                                    <div
                                      key={optIdx}
                                      className={`flex items-center gap-2 p-1.5 rounded-md border text-xs ${
                                        isCorrect
                                          ? "border-emerald-500/40 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                                          : "border-border/40 bg-secondary/30 text-muted-foreground"
                                      }`}
                                    >
                                      <span className="font-bold uppercase text-[10px]">
                                        {String.fromCharCode(65 + optIdx)}.
                                      </span>
                                      <span className="flex-1">{optionText}</span>
                                      {isCorrect && (
                                        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/40 text-[10px] py-0 px-1.5 gap-1">
                                          <CheckIcon className="size-3" /> Correct
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Coding Question Details */}
                  {codingQuestion && (
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <CodeIcon className="size-4" />
                        Generated Coding Challenge
                      </h5>
                      <div className="rounded-xl border border-border/80 bg-card p-4 text-xs space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <h6 className="text-sm font-bold text-foreground">{codingQuestion.title}</h6>
                          {codingQuestion.difficulty && (
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {codingQuestion.difficulty}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                          {codingQuestion.description}
                        </p>

                        {codingQuestion.examples && codingQuestion.examples.length > 0 && (
                          <div className="rounded-lg bg-secondary/50 p-3 space-y-1.5 font-mono text-[11px] border border-border/50">
                            <p className="font-semibold text-xs font-sans text-foreground">Sample Test Case:</p>
                            <div><span className="text-muted-foreground">Input:</span> {codingQuestion.examples[0].input}</div>
                            <div><span className="text-muted-foreground">Output:</span> {codingQuestion.examples[0].output}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {publicUrl && (
            <div className="rounded-lg border border-border/70 bg-background/45 p-4">
              <p className="text-sm font-semibold">Candidate application link</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <Input readOnly value={publicUrl} />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={copyPublicLink}>
                    <CopyIcon className="size-4" />
                    Copy
                  </Button>
                  <Button asChild type="button">
                    <Link href={`/jobs/${form.jobId}`} target="_blank">
                      <ExternalLinkIcon className="size-4" />
                      Open
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : jobId ? (
                <SaveIcon className="size-4" />
              ) : (
                <CheckCircle2Icon className="size-4" />
              )}
              {jobId ? "Save Job" : "Create Job"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
