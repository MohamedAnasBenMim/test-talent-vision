"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendApplicationConfirmationEmail } from "@/actions/application.actions";
import { autoSendTechnicalInterviewInvite } from "@/actions/auto-invite.actions";
import { cn } from "@/lib/utils";
import {
  BriefcaseBusinessIcon,
  CheckCircle2Icon,
  FileUpIcon,
  GithubIcon,
  LinkedinIcon,
  LinkIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  SendIcon,
  UserIcon,
} from "lucide-react";
import toast from "react-hot-toast";

const MAX_CV_SIZE = 10 * 1024 * 1024;
const ACCEPTED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"];
const AUTO_TECHNICAL_INVITE_EMAIL = "medanasbenmim123@gmail.com";

type ApplicationFormProps = {
  jobId?: string;
  defaultPosition?: string;
  lockPosition?: boolean;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
};

function normalizeOptionalUrl(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ApplicationForm({
  jobId,
  defaultPosition = "",
  lockPosition = false,
}: ApplicationFormProps) {
  const generateCvUploadUrl = useMutation(api.applications.generateCvUploadUrl);
  const submitApplication = useMutation(api.applications.submitApplication);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    phone: "",
    position: defaultPosition,
    portfolioUrl: "",
    githubUrl: "",
    linkedinUrl: "",
  });

  const selectedFileLabel = useMemo(() => {
    if (!cvFile) return "Upload PDF, DOC, or DOCX";
    return `${cvFile.name} (${formatFileSize(cvFile.size)})`;
  }, [cvFile]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) {
      setCvFile(null);
      return;
    }

    const extension = getFileExtension(file.name);

    if (!ACCEPTED_CV_EXTENSIONS.includes(extension)) {
      toast.error("Please upload a PDF, DOC, or DOCX file");
      return;
    }

    if (file.size > MAX_CV_SIZE) {
      toast.error("CV file must be 10 MB or smaller");
      return;
    }

    setCvFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!cvFile) {
      toast.error("Please upload your CV");
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadUrl = await generateCvUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": cvFile.type || "application/octet-stream" },
        body: cvFile,
      });

      if (!uploadResult.ok) {
        throw new Error("CV upload failed");
      }

      const { storageId } = (await uploadResult.json()) as { storageId: Id<"_storage"> };

      const applicationId = await submitApplication({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        position: form.position.trim(),
        jobId,
        portfolioUrl: normalizeOptionalUrl(form.portfolioUrl),
        githubUrl: normalizeOptionalUrl(form.githubUrl),
        linkedinUrl: normalizeOptionalUrl(form.linkedinUrl),
        cvStorageId: storageId,
        cvFileName: cvFile.name,
        cvFileSize: cvFile.size,
        cvFileType: cvFile.type || "application/octet-stream",
      });

      const submittedEmail = form.email.trim().toLowerCase();

      try {
        await sendApplicationConfirmationEmail({
          candidateEmail: submittedEmail,
          candidateName: form.fullName.trim(),
          position: form.position.trim(),
        });
        toast.success("Application confirmation email sent");
      } catch (emailError) {
        console.error(emailError);
        toast.error("Application submitted, but confirmation email was not sent.");
      }

      if (submittedEmail === AUTO_TECHNICAL_INVITE_EMAIL) {
        try {
          const result = await autoSendTechnicalInterviewInvite({
            applicationId,
            appOrigin: window.location.origin,
          });

          if (result.sent) {
            toast.success("Technical interview invitation sent");
          }
        } catch (autoInviteError) {
          console.error(autoInviteError);
          toast.error("Application submitted, but technical interview invitation was not sent.");
        }
      }

      setSubmittedId(applicationId);
      setCvFile(null);
      setForm({
        fullName: "",
        email: "",
        phone: "",
        position: defaultPosition,
        portfolioUrl: "",
        githubUrl: "",
        linkedinUrl: "",
      });
      toast.success("Application submitted");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not submit your application. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <section className="mx-auto max-w-2xl rounded-lg border border-border/70 bg-card/85 p-8 text-center shadow-sm shadow-black/20">
        <div className="mx-auto grid size-14 place-items-center rounded-md border border-accent/30 bg-accent/10">
          <CheckCircle2Icon className="size-7 text-accent" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Application Submitted</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Thank you for applying to BECARTH.AI Consulting. The recruiting team will review your CV
          and contact you by email about the next step.
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]"
    >
      <section className="rounded-lg border border-border/70 bg-card/85 p-6 shadow-sm shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          BECARTH.AI Careers
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Candidate Application</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Send your profile for review by the BECARTHAI TalentVision team.
        </p>

        <div className="mt-8 space-y-4">
          <div className="rounded-lg border border-border/70 bg-background/50 p-4">
            <div className="flex items-center gap-3">
              <BriefcaseBusinessIcon className="size-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Application Status</p>
                <p className="text-sm text-muted-foreground">Submitted CV review</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/50 p-4">
            <div className="flex items-center gap-3">
              <FileUpIcon className="size-5 text-accent" />
              <div>
                <p className="text-sm font-semibold">CV File</p>
                <p className="text-sm text-muted-foreground">{selectedFileLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/70 bg-card/85 p-6 shadow-sm shadow-black/20">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                required
                autoComplete="name"
                className="pl-9"
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="pl-9"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <div className="relative">
              <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                required
                autoComplete="tel"
                className="pl-9"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Job / position</Label>
            <div className="relative">
              <BriefcaseBusinessIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="position"
                required
                className="pl-9"
                readOnly={lockPosition}
                value={form.position}
                onChange={(event) => updateField("position", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolioUrl">Portfolio</Label>
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="portfolioUrl"
                type="url"
                autoComplete="url"
                className="pl-9"
                placeholder="https://"
                value={form.portfolioUrl}
                onChange={(event) => updateField("portfolioUrl", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="githubUrl">GitHub</Label>
            <div className="relative">
              <GithubIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="githubUrl"
                type="url"
                className="pl-9"
                placeholder="https://github.com/"
                value={form.githubUrl}
                onChange={(event) => updateField("githubUrl", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn</Label>
            <div className="relative">
              <LinkedinIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="linkedinUrl"
                type="url"
                className="pl-9"
                placeholder="https://linkedin.com/in/"
                value={form.linkedinUrl}
                onChange={(event) => updateField("linkedinUrl", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cv">CV upload</Label>
            <Input
              id="cv"
              type="file"
              required
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => handleFileChange(event.target.files?.[0])}
              className={cn("cursor-pointer", cvFile && "border-accent/60")}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Submitting
              </>
            ) : (
              <>
                <SendIcon className="size-4" />
                Submit Application
              </>
            )}
          </Button>
        </div>
      </section>
    </form>
  );
}
