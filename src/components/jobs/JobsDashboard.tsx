"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  BriefcaseIcon,
  CalendarIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "@/components/jobs/ConfirmDeleteModal";

export default function JobsDashboard() {
  const jobs = useQuery(api.applications.getJobs);
  const applications = useQuery(api.applications.getApplications);
  const deleteJob = useMutation(api.applications.deleteJob);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingTarget, setDeletingTarget] = useState<{ jobId: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    if (!searchTerm.trim()) return jobs;
    const query = searchTerm.toLowerCase();
    return jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query) ||
        (job.location && job.location.toLowerCase().includes(query)) ||
        (job.contractType && job.contractType.toLowerCase().includes(query))
    );
  }, [jobs, searchTerm]);

  const confirmDelete = async () => {
    if (!deletingTarget) return;
    setIsDeleting(true);
    try {
      await deleteJob({ jobId: deletingTarget.jobId });
      toast.success("Job position removed");
      setDeletingTarget(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to delete job position");
    } finally {
      setIsDeleting(false);
    }
  };

  if (jobs === undefined) return <LoaderUI />;

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Jobs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage job postings, set AI scoring criteria, and publish public candidate apply links.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard/applications">
              <UsersIcon className="size-4" />
              View Candidates
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/jobs/new">
              <PlusIcon className="size-4" />
              Create Job
            </Link>
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title, location, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">
            All ({jobs.length})
          </Badge>
          <Badge variant="success" className="cursor-pointer hover:opacity-90">
            Active ({jobs.filter((j) => (j.status ?? "published") === "published").length})
          </Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
            Drafts ({jobs.filter((j) => j.status === "draft").length})
          </Badge>
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BriefcaseIcon className="size-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold">No Jobs Found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {searchTerm ? "No job matches your search criteria." : "Create your first job posting to start sourcing candidate applications."}
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/jobs/new">
              <PlusIcon className="size-4" />
              Create First Job
            </Link>
          </Button>
        </section>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => {
            const candidateCount =
              applications?.filter((a) => a.jobId === job.jobId).length ?? 0;
            const isPublished = (job.status ?? "published") === "published";

            return (
              <Card
                key={job._id}
                className="group flex flex-col justify-between hover:border-primary/50 hover:shadow-md transition-all"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant={isPublished ? "success" : "secondary"} className="mb-2">
                        {isPublished ? "Active Requisition" : "Draft"}
                      </Badge>
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">
                        {job.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-5 py-2 space-y-4 flex-1">
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {job.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground pt-1">
                    <span className="flex items-center gap-1.5 truncate">
                      <BriefcaseIcon className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">{job.contractType || "Full-Time"}</span>
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                      <MapPinIcon className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">{job.location || "Remote"}</span>
                    </span>
                  </div>

                  {/* Required Skills Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.requiredSkills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.requiredSkills.length > 3 && (
                      <span className="rounded-md bg-secondary/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        +{job.requiredSkills.length - 3}
                      </span>
                    )}
                  </div>
                </CardContent>

                <div className="p-5 pt-3 border-t border-border/60 flex items-center justify-between mt-auto bg-secondary/15 rounded-b-xl">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <UsersIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{candidateCount} Applicants</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete Position"
                      onClick={() => setDeletingTarget({ jobId: job.jobId, title: job.title })}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/dashboard/jobs/${job.jobId}`}>
                        Manage <ChevronRightIcon className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(deletingTarget)}
        onClose={() => setDeletingTarget(null)}
        onConfirm={confirmDelete}
        title={deletingTarget?.title || ""}
        isDeleting={isDeleting}
      />
    </div>
  );
}
