"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

export default function JobsDashboard() {
  const jobs = useQuery(api.applications.getJobs);

  if (jobs === undefined) return <LoaderUI />;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 rounded-lg border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Recruiting Setup
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create public job links and define the requirements AI uses to rank candidates.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard/applications">Applications</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/jobs/new">
              <PlusIcon className="size-4" />
              New Job
            </Link>
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <section className="rounded-lg border border-border/70 bg-card/80 p-10 text-center shadow-sm shadow-black/20">
          <BriefcaseBusinessIcon className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Jobs Yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Create a job post, copy its public link, and paste that link into LinkedIn.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/jobs/new">Create First Job</Link>
          </Button>
        </section>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card
              key={job._id}
              className="overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
            >
              <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.4fr_1fr_0.7fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{job.title}</h2>
                    <Badge variant={(job.status ?? "published") === "published" ? "default" : "outline"}>
                      {job.status ?? "published"}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {job.description}
                  </p>
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-2">
                    <BriefcaseBusinessIcon className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{job.contractType || "Contract not specified"}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPinIcon className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{job.location || "Location not specified"}</span>
                  </span>
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <UsersIcon className="size-4 text-accent" />
                    {job.requiredSkills.length} required skills
                  </span>
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="size-4 text-accent" />
                    {format(new Date(job.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>

                <Button asChild>
                  <Link href={`/dashboard/jobs/${job.jobId}`}>
                    Manage
                    <ExternalLinkIcon className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
