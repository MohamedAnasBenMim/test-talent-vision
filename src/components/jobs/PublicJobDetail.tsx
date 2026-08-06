"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ApplicationForm from "@/components/applications/ApplicationForm";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeftIcon, BriefcaseBusinessIcon, GraduationCapIcon, LanguagesIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";

export default function PublicJobDetail({ jobId }: { jobId: string }) {
  const job = useQuery(api.applications.getPublicJobByJobId, { jobId });

  if (job === undefined) return <LoaderUI />;

  if (!job) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold">Job Not Found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This job may be closed, unpublished, or unavailable.
            </p>
            <Button asChild className="mt-6">
              <Link href="/jobs">View Open Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Button asChild variant="ghost">
          <Link href="/jobs">
            <ArrowLeftIcon className="size-4" />
            Open Jobs
          </Link>
        </Button>
      </div>

      <section className="mb-8 overflow-hidden rounded-lg border border-border/70 bg-card/85 shadow-sm shadow-black/20">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-fuchsia-400" />
        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            BECARTH.AI Consulting Recrute
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl">
            {job.title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.contractType && <Badge>{job.contractType}</Badge>}
            {job.location && (
              <Badge variant="outline">
                <MapPinIcon className="mr-1 size-3" />
                {job.location}
              </Badge>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold">Job Description</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {job.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-5 p-6">
              <RequirementBlock
                title="Required Skills"
                icon={<BriefcaseBusinessIcon className="size-4 text-primary" />}
                items={job.requiredSkills}
              />
              <RequirementBlock
                title="Nice-to-have Skills"
                icon={<BriefcaseBusinessIcon className="size-4 text-accent" />}
                items={job.niceToHaveSkills}
              />
              <RequirementBlock
                title="Languages"
                icon={<LanguagesIcon className="size-4 text-primary" />}
                items={job.languages}
              />
              {(job.minimumExperience || job.education) && (
                <div className="rounded-lg border border-border/70 bg-background/45 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <GraduationCapIcon className="size-4 text-primary" />
                    Profile
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {job.minimumExperience && <p>Experience: {job.minimumExperience}</p>}
                    {job.education && <p>Education: {job.education}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section id="apply">
          <ApplicationForm jobId={job.jobId} defaultPosition={job.title} lockPosition />
        </section>
      </div>
    </div>
  );
}

function RequirementBlock({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/70 bg-background/45 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="outline">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
