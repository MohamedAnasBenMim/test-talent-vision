"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BriefcaseBusinessIcon, ExternalLinkIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";

export default function PublicJobs() {
  const jobs = useQuery(api.applications.getPublicJobs);

  if (jobs === undefined) return <LoaderUI />;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-8 rounded-lg border border-border/70 bg-card/85 p-6 shadow-sm shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          BECARTH.AI Careers
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Open Jobs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Apply to a specific role so your CV can be reviewed against the right job description.
        </p>
      </section>

      {jobs.length === 0 ? (
        <section className="rounded-lg border border-border/70 bg-card/85 p-10 text-center">
          <BriefcaseBusinessIcon className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Published Jobs</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            New roles will appear here when the recruiting team publishes them.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job._id} className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-accent to-fuchsia-400" />
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{job.title}</h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPinIcon className="size-4 text-primary" />
                      {job.location || "Location not specified"}
                    </p>
                  </div>
                  {job.contractType && <Badge variant="outline">{job.contractType}</Badge>}
                </div>
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
                  {job.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {job.requiredSkills.slice(0, 5).map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <Button asChild className="mt-5 w-full">
                  <Link href={`/jobs/${job.jobId}`}>
                    View and Apply
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
