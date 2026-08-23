"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
      <section className="rounded-2xl border border-emerald-500/30 bg-card p-8 sm:p-10 text-center shadow-xl shadow-emerald-500/5 space-y-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
          <CheckCircle2Icon className="size-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Application Submitted Successfully!</h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Thank you for applying to <span className="font-semibold text-foreground">BECARTH.AI</span>. Your CV has been securely registered in our system. You will receive an email confirmation shortly with details about your technical assessment.
        </p>
      </section>
    );
  }

  return (
    <Card className="overflow-hidden border border-border/80 bg-card/95 shadow-xl shadow-black/5">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-purple-600" />
      <div className="p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <UserIcon className="size-3.5" />
            Candidate Registration
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
            Apply for this Position
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Fill out your personal details and upload your CV to start your evaluation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal Info Group */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    required
                    placeholder="e.g. Alex Morgan"
                    autoComplete="name"
                    className="h-11 pl-10 bg-background/60 text-sm focus-visible:ring-primary"
                    value={form.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="alex@example.com"
                    autoComplete="email"
                    className="h-11 pl-10 bg-background/60 text-sm focus-visible:ring-primary"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-foreground">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    required
                    placeholder="+216 20 000 000"
                    autoComplete="tel"
                    className="h-11 pl-10 bg-background/60 text-sm focus-visible:ring-primary"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="position" className="text-xs font-semibold text-foreground">
                  Target Position <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <BriefcaseBusinessIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="position"
                    required
                    className="h-11 pl-10 bg-background/60 text-sm focus-visible:ring-primary font-medium"
                    readOnly={lockPosition}
                    value={form.position}
                    onChange={(event) => updateField("position", event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social / Portfolio Links */}
          <div className="pt-2 space-y-3 border-t border-border/50">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Professional Profiles (Optional)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="portfolioUrl" className="text-[11px] font-medium text-muted-foreground">
                  Portfolio
                </Label>
                <div className="relative">
                  <LinkIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="portfolioUrl"
                    type="url"
                    className="h-9 pl-9 text-xs bg-background/50"
                    placeholder="https://yourportfolio.com"
                    value={form.portfolioUrl}
                    onChange={(event) => updateField("portfolioUrl", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="githubUrl" className="text-[11px] font-medium text-muted-foreground">
                  GitHub
                </Label>
                <div className="relative">
                  <GithubIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="githubUrl"
                    type="url"
                    className="h-9 pl-9 text-xs bg-background/50"
                    placeholder="https://github.com/username"
                    value={form.githubUrl}
                    onChange={(event) => updateField("githubUrl", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="linkedinUrl" className="text-[11px] font-medium text-muted-foreground">
                  LinkedIn
                </Label>
                <div className="relative">
                  <LinkedinIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="linkedinUrl"
                    type="url"
                    className="h-9 pl-9 text-xs bg-background/50"
                    placeholder="https://linkedin.com/in/user"
                    value={form.linkedinUrl}
                    onChange={(event) => updateField("linkedinUrl", event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Custom File Upload Box */}
          <div className="pt-2 space-y-2 border-t border-border/50">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Upload Resume / CV <span className="text-destructive">*</span></span>
              <span className="text-[11px] font-normal text-muted-foreground">PDF, DOC, DOCX up to 10MB</span>
            </Label>
            
            <label
              htmlFor="cv"
              className={cn(
                "group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer",
                cvFile
                  ? "border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10"
                  : "border-border hover:border-primary/60 hover:bg-primary/5"
              )}
            >
              <Input
                id="cv"
                type="file"
                required={!cvFile}
                className="sr-only"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => handleFileChange(event.target.files?.[0])}
              />
              {cvFile ? (
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <CheckCircle2Icon className="size-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold truncate max-w-xs">{cvFile.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatFileSize(cvFile.size)} · Click to change file</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <FileUpIcon className="size-6" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop your CV file
                  </div>
                  <p className="text-[10px] text-muted-foreground">Supported formats: .pdf, .doc, .docx</p>
                </div>
              )}
            </label>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all mt-4"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin mr-2" />
                Submitting Profile...
              </>
            ) : (
              <>
                <SendIcon className="size-4 mr-2" />
                Submit Application & Proceed
              </>
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
