"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ApplicationForm from "@/components/applications/ApplicationForm";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeftIcon,
  BriefcaseBusinessIcon,
  GraduationCapIcon,
  LanguagesIcon,
  MapPinIcon,
  SparklesIcon,
  Building2Icon,
  UsersIcon,
  CalendarIcon,
  ExternalLinkIcon,
} from "lucide-react";
import Link from "next/link";
import FormattedMarkdown from "@/components/ui/formatted-markdown";
import CandidateChatbot from "@/components/CandidateChatbot";

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
              This job position may be closed, unpublished, or unavailable.
            </p>
            <Button asChild className="mt-6">
              <Link href="/jobs">View Open Positions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/jobs">
            <ArrowLeftIcon className="size-4" />
            All Positions
          </Link>
        </Button>
      </div>

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 sm:p-10 shadow-xl shadow-black/5">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-purple-600" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
                BECARTH.AI TalentVision
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs font-semibold text-muted-foreground">Requisition #{job.jobId}</span>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-foreground">
              {job.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {job.contractType && (
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 py-1 px-3">
                  <BriefcaseBusinessIcon className="mr-1.5 size-3.5" />
                  {job.contractType}
                </Badge>
              )}
              {job.location && (
                <Badge variant="outline" className="py-1 px-3">
                  <MapPinIcon className="mr-1.5 size-3.5 text-muted-foreground" />
                  {job.location}
                </Badge>
              )}
              {job.minimumExperience && (
                <Badge variant="secondary" className="py-1 px-3">
                  <GraduationCapIcon className="mr-1.5 size-3.5" />
                  {job.minimumExperience}
                </Badge>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <Button
              size="lg"
              className="w-full sm:w-auto h-12 px-8 text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              onClick={() => {
                document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Apply For Position ↓
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] items-start">
        {/* Left Side: Job Specs & Overview */}
        <section className="space-y-6">
          <Card className="border-border/80 shadow-md">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-3">
                Job Overview & Description
              </h2>
              <FormattedMarkdown content={job.description} />
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-md">
            <CardContent className="p-6 sm:p-8 space-y-5">
              <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-3">
                Candidate Requirements
              </h2>
              
              <RequirementBlock
                title="Required Core Skills"
                icon={<BriefcaseBusinessIcon className="size-4 text-primary" />}
                items={job.requiredSkills}
              />

              <RequirementBlock
                title="Nice-to-Have Skills"
                icon={<SparklesIcon className="size-4 text-purple-400" />}
                items={job.niceToHaveSkills}
              />

              <RequirementBlock
                title="Languages Required"
                icon={<LanguagesIcon className="size-4 text-emerald-500" />}
                items={job.languages}
              />

              {(job.minimumExperience || job.education) && (
                <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                    <GraduationCapIcon className="size-4 text-primary" />
                    Background & Education
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground pt-1">
                    {job.minimumExperience && <p><span className="font-semibold text-foreground">Experience:</span> {job.minimumExperience}</p>}
                    {job.education && <p><span className="font-semibold text-foreground">Education:</span> {job.education}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BECARTH.AI Consulting Overview Card */}
          <Card className="border-border/80 shadow-md overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-purple-600" />
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Building2Icon className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                    About BE CARTH.AI Consulting
                  </h2>
                  <p className="text-xs text-muted-foreground">Financial & Banking Digital Transformation Experts</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground bg-secondary/20 p-4.5 rounded-xl border border-border/50">
                Fondée en 2025, BE CARTHAI Consulting est un cabinet spécialisé dans l'accompagnement des institutions financières et bancaires dans leur transformation digitale. Nous combinons expertise en développement d'applications informatiques, business intelligence et intelligence artificielle pour aider nos clients à transformer leurs données en avantage stratégique durable. Notre approche s'appuie sur les standards internationaux en gestion de projets informatiques et une connaissance approfondie des exigences réglementaires du secteur financier, notamment les circulaires BCT et les normes IFRS. Basés à Tunis, nous accompagnons les organisations de la région MENA dans la structuration de leur SI, la mise en conformité réglementaire et le développement d'une culture data-driven orientée vers la performance et l'innovation.
              </p>

              {/* Key Company Facts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <BriefcaseBusinessIcon className="size-3.5 text-primary shrink-0" />
                    Industry
                  </div>
                  <p className="text-xs font-bold text-foreground truncate">IT Services & Consulting</p>
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <UsersIcon className="size-3.5 text-primary shrink-0" />
                    Company Size
                  </div>
                  <p className="text-xs font-bold text-foreground">2 - 10 Employees</p>
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <CalendarIcon className="size-3.5 text-primary shrink-0" />
                    Founded
                  </div>
                  <p className="text-xs font-bold text-foreground">2025</p>
                </div>

                <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <MapPinIcon className="size-3.5 text-primary shrink-0" />
                    Headquarters
                  </div>
                  <p className="text-xs font-bold text-foreground truncate">Hammam-Lif, Ben Arous</p>
                </div>
              </div>

              {/* Address & Directions */}
              <div className="rounded-xl border border-border/60 bg-background/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <MapPinIcon className="size-4 text-emerald-500 shrink-0" />
                    Primary Location & Siège Social
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    12 Avenue de la république, Bureau 1.2, 2ème étage, Hammam-Lif, Ben Arous 2050, TN
                  </p>
                </div>

                <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
                  <a
                    href="https://maps.google.com/?q=12+Avenue+de+la+république,+Bureau+1.2,+Hammam-Lif,+Ben+Arous+2050,+TN"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon className="size-3.5" />
                    Get Directions
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Right Side: Spacious Candidate Form */}
        <section id="apply-form" className="sticky top-6">
          <ApplicationForm jobId={job.jobId} defaultPosition={job.title} lockPosition />
        </section>
      </div>

      <CandidateChatbot jobId={job.jobId} />
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
