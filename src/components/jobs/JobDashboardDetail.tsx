"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LoaderUI from "@/components/LoaderUI";
import JobEditor from "@/components/jobs/JobEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AI_RECOMMENDATION_LABELS,
  AiRecommendation,
  getAiRecommendationVariant,
  FINAL_HR_RECOMMENDATION_LABELS,
  FinalHrRecommendation,
  getFinalHrRecommendationVariant,
} from "@/components/applications/status";
import { format } from "date-fns";
import { ArrowLeftIcon, CopyIcon, ExternalLinkIcon, MailIcon, PhoneIcon, Trash2Icon, Loader2Icon, EyeIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "@/components/jobs/ConfirmDeleteModal";

export default function JobDashboardDetail({ jobId }: { jobId: string }) {
  const router = useRouter();
  const job = useQuery(api.applications.getJobByJobId, { jobId });
  const applications = useQuery(api.applications.getApplicationsByJobId, { jobId });
  const deleteJob = useMutation(api.applications.deleteJob);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/jobs/${jobId}`;
  }, [jobId]);

  const copyPublicLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Public job link copied");
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteJob({ jobId });
      toast.success("Job position deleted successfully");
      router.push("/dashboard/jobs");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to delete job position");
      setIsDeleting(false);
    }
  };

  if (job === undefined || applications === undefined) return <LoaderUI />;

  if (!job) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold">Job Not Found</h1>
            <Button asChild className="mt-6">
              <Link href="/dashboard/jobs">Back to Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/dashboard/jobs">
            <ArrowLeftIcon className="size-3.5" />
            Back to Positions
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyPublicLink}>
            <CopyIcon className="size-4" />
            Copy Public Link
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/jobs/${job.jobId}`} target="_blank">
              <ExternalLinkIcon className="size-4" />
              Open Candidate Page
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)} disabled={isDeleting}>
            {isDeleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
            Delete Job
          </Button>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={job.title || jobId}
        isDeleting={isDeleting}
      />

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-fuchsia-400" />
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Job Pipeline
                  </p>
                  <CardTitle className="mt-3 text-3xl">{job.title}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {job.contractType || "Contract not specified"} ·{" "}
                    {job.location || "Location not specified"}
                  </p>
                </div>
                <Badge>{applications.length} applicants</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/70 bg-background/45 p-4">
                <p className="text-sm font-semibold">LinkedIn apply link</p>
                <p className="mt-2 break-all text-sm text-muted-foreground">{publicUrl}</p>
              </div>
            </CardContent>
          </Card>

          <JobEditor jobId={job.jobId} />
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Applicants Sorted by AI Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {applications.length === 0 ? (
                <div className="rounded-lg border border-border/70 bg-background/45 p-8 text-center text-sm text-muted-foreground">
                  No one has applied for this job yet.
                </div>
              ) : (
                applications.map((application) => {
                  const recommendation = application.aiRecommendation as AiRecommendation | undefined;
                  const hrRec = application.finalRecommendation as FinalHrRecommendation | undefined;
                  const cvScore = application.cvScore ?? application.aiScore;
                  const techScore = application.technicalScore;
                  const finalScore = application.finalScore ?? (cvScore && techScore ? Math.round(cvScore * 0.4 + techScore * 0.6) : cvScore);

                  return (
                    <div
                      key={application._id}
                      className="rounded-lg border border-border/70 bg-background/45 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/applications/${application._id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {application.fullName}
                          </Link>
                          <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-2">
                              <MailIcon className="size-4 text-primary" />
                              {application.email}
                            </span>
                            <span className="flex items-center gap-2">
                              <PhoneIcon className="size-4 text-primary" />
                              {application.phone}
                            </span>
                          </div>
                        </div>

                        {/* Dual & Final Scores */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50 text-center">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold">📄 CV</p>
                              <p className="text-sm font-bold">{cvScore ?? "--"}</p>
                            </div>
                            <div className="border-l border-border/60 pl-3">
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold">💻 Tech</p>
                              <p className="text-sm font-bold text-primary">{techScore ?? "--"}</p>
                            </div>
                            <div className="border-l border-border/60 pl-3">
                              <p className="text-[10px] text-primary uppercase font-semibold">⭐ Final</p>
                              <p className="text-base font-black text-primary">{finalScore ?? "--"}</p>
                            </div>
                          </div>

                          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-primary/30 hover:bg-primary/10">
                            <Link href={`/dashboard/applications/${application._id}`}>
                              <EyeIcon className="size-3.5 text-primary" />
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{application.status}</Badge>
                          {hrRec ? (
                            <Badge variant={getFinalHrRecommendationVariant(hrRec)}>
                              {FINAL_HR_RECOMMENDATION_LABELS[hrRec]}
                            </Badge>
                          ) : recommendation ? (
                            <Badge variant={getAiRecommendationVariant(recommendation)}>
                              {AI_RECOMMENDATION_LABELS[recommendation]}
                            </Badge>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(application.createdAt), "MMM d, yyyy · h:mm a")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
