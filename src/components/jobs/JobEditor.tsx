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
import { joinList, normalizeOptional, slugifyJobId, splitList } from "@/components/jobs/jobUtils";
import { SparklesIcon, CheckCircle2Icon, CopyIcon, ExternalLinkIcon, Loader2Icon, SaveIcon } from "lucide-react";
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
      toast.success("Job details generated with AI!");
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
      });

      toast.success("Job saved");
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
            <Label htmlFor="description">Full job description</Label>
            <Textarea
              id="description"
              rows={10}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Paste the full LinkedIn job post here."
              required
            />
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
