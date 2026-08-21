"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  BriefcaseIcon,
  ChevronRightIcon,
  FileTextIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";

export default function ApplicationsDashboard() {
  const applications = useQuery(api.applications.getApplications);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "high" | "review" | "passed">("all");

  const filteredApplications = useMemo(() => {
    if (!applications) return [];

    return applications.filter((app) => {
      // Search term filter
      const matchesSearch =
        !searchTerm.trim() ||
        app.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.position.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status tab filter
      if (activeFilter === "high") return (app.aiScore ?? 0) >= 80;
      if (activeFilter === "review") return app.status === "cv_review_required";
      if (activeFilter === "passed") return app.status === "technical_passed";

      return true;
    });
  }, [applications, searchTerm, activeFilter]);

  if (applications === undefined) return <LoaderUI />;

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Candidates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review inbound CV submissions, AI screening scores, and schedule candidate technical interviews.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            Interview Dashboard
          </Link>
        </Button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeFilter === "all" ? "default" : "ghost"}
            onClick={() => setActiveFilter("all")}
          >
            All ({applications.length})
          </Button>
          <Button
            size="sm"
            variant={activeFilter === "high" ? "default" : "ghost"}
            onClick={() => setActiveFilter("high")}
          >
            High Match (&gt;80%)
          </Button>
          <Button
            size="sm"
            variant={activeFilter === "review" ? "default" : "ghost"}
            onClick={() => setActiveFilter("review")}
          >
            In Review
          </Button>
          <Button
            size="sm"
            variant={activeFilter === "passed" ? "default" : "ghost"}
            onClick={() => setActiveFilter("passed")}
          >
            Passed
          </Button>
        </div>
      </div>

      {/* Candidates Table Card */}
      <Card>
        <CardContent className="p-0">
          {filteredApplications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <FileTextIcon className="mx-auto size-10 opacity-50" />
              <p className="font-medium text-base">No candidate records match your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="px-6 py-3.5">Candidate</th>
                    <th className="px-6 py-3.5">Position</th>
                    <th className="px-6 py-3.5">AI Score</th>
                    <th className="px-6 py-3.5">Recommendation</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Applied Date</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredApplications.map((app) => {
                    const status = app.status as ApplicationStatus;
                    const recommendation = app.aiRecommendation as AiRecommendation | undefined;

                    return (
                      <tr key={app._id} className="hover:bg-secondary/20 transition-colors">
                        {/* Candidate Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                              {app.fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">{app.fullName}</p>
                              <p className="text-xs text-muted-foreground truncate">{app.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Position */}
                        <td className="px-6 py-4 font-semibold text-foreground">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium">
                            <BriefcaseIcon className="size-3 text-primary" />
                            {app.position}
                          </span>
                        </td>

                        {/* AI Score */}
                        <td className="px-6 py-4">
                          {typeof app.aiScore === "number" ? (
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-base">{app.aiScore}</span>
                              <span className="text-xs text-muted-foreground">/100</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Analyzing...</span>
                          )}
                        </td>

                        {/* Recommendation */}
                        <td className="px-6 py-4">
                          {recommendation ? (
                            <Badge variant={getAiRecommendationVariant(recommendation)}>
                              {AI_RECOMMENDATION_LABELS[recommendation]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <Badge variant={getApplicationStatusVariant(status)}>
                            {APPLICATION_STATUS_LABELS[status]}
                          </Badge>
                        </td>

                        {/* Applied Date */}
                        <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(app.createdAt), "MMM d, yyyy")}
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right">
                          <Button asChild size="sm">
                            <Link href={`/dashboard/applications/${app._id}`}>
                              Review <ChevronRightIcon className="size-3.5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
