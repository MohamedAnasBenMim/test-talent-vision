"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  APPLICATION_STATUS_LABELS,
  AI_RECOMMENDATION_LABELS,
  ApplicationStatus,
  AiRecommendation,
  getAiRecommendationVariant,
  getApplicationStatusVariant,
} from "@/components/applications/status";
import { format } from "date-fns";
import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";

export default function ApplicationsDashboard() {
  const applications = useQuery(api.applications.getApplications);

  if (applications === undefined) return <LoaderUI />;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 rounded-lg border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Candidate Pipeline
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review submitted CVs, shortlist candidates, and start technical interviews.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Interview Dashboard</Link>
        </Button>
      </div>

      {applications.length === 0 ? (
        <section className="rounded-lg border border-border/70 bg-card/80 p-10 text-center shadow-sm shadow-black/20">
          <FileTextIcon className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Applications Yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Candidate submissions from the public apply page will appear here.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {applications.map((application) => {
            const status = application.status as ApplicationStatus;
            const recommendation = application.aiRecommendation as AiRecommendation | undefined;

            return (
              <Card
                key={application._id}
                className="overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
              >
                <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold">{application.fullName}</h2>
                      <Badge variant={getApplicationStatusVariant(status)}>
                        {APPLICATION_STATUS_LABELS[status]}
                      </Badge>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <MailIcon className="size-4 shrink-0 text-primary" />
                        <span className="truncate">{application.email}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <PhoneIcon className="size-4 shrink-0 text-primary" />
                        <span className="truncate">{application.phone}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-2">
                      <BriefcaseBusinessIcon className="size-4 shrink-0 text-accent" />
                      <span className="truncate">{application.position}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <FileTextIcon className="size-4 shrink-0 text-accent" />
                      <span className="truncate">{application.cvFileName}</span>
                    </span>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-background/45 p-3">
                    <p className="text-xs text-muted-foreground">AI Score</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {application.aiScore ?? "--"}
                      </span>
                      {typeof application.aiScore === "number" && (
                        <span className="text-xs text-muted-foreground">/ 100</span>
                      )}
                    </div>
                    {recommendation && (
                      <Badge className="mt-2" variant={getAiRecommendationVariant(recommendation)}>
                        {AI_RECOMMENDATION_LABELS[recommendation]}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="size-4 text-primary" />
                    {format(new Date(application.createdAt), "MMM d, yyyy · h:mm a")}
                  </div>

                  <Button asChild>
                    <Link href={`/dashboard/applications/${application._id}`}>
                      <UserIcon className="size-4" />
                      Review
                      <ExternalLinkIcon className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
