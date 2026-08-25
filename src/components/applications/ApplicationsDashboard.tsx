"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPLICATION_STATUS_LABELS,
  AI_RECOMMENDATION_LABELS,
  FINAL_HR_RECOMMENDATION_LABELS,
  ApplicationStatus,
  AiRecommendation,
  FinalHrRecommendation,
  getAiRecommendationVariant,
  getApplicationStatusVariant,
  getFinalHrRecommendationVariant,
} from "@/components/applications/status";
import { format } from "date-fns";
import {
  ArrowUpDownIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  FileTextIcon,
  SearchIcon,
  SparklesIcon,
  TrophyIcon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";

type SortOption = "finalScore" | "techScore" | "cvScore" | "date";

export default function ApplicationsDashboard() {
  const applications = useQuery(api.applications.getApplications);
  const updateCandidateFinalEvaluation = useMutation(api.applications.updateCandidateFinalEvaluation);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPreselectedOnly, setIsPreselectedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("finalScore");

  const preselectedCount = useMemo(() => {
    if (!applications) return 0;
    return applications.filter(
      (app) =>
        app.status === "hr_shortlisted" ||
        app.finalRecommendation === "strong_recommend_hr" ||
        app.finalRecommendation === "recommend_hr"
    ).length;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    if (!applications) return [];

    const filtered = applications.filter((app) => {
      // Search term filter
      const matchesSearch =
        !searchTerm.trim() ||
        app.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.position.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status toggle filter
      if (isPreselectedOnly) {
        return (
          app.status === "hr_shortlisted" ||
          app.finalRecommendation === "strong_recommend_hr" ||
          app.finalRecommendation === "recommend_hr"
        );
      }

      return true;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === "finalScore") {
        const scoreA = a.finalScore ?? a.cvScore ?? a.aiScore ?? 0;
        const scoreB = b.finalScore ?? b.cvScore ?? b.aiScore ?? 0;
        return scoreB - scoreA;
      }
      if (sortBy === "techScore") {
        const techA = a.technicalScore ?? 0;
        const techB = b.technicalScore ?? 0;
        return techB - techA;
      }
      if (sortBy === "cvScore") {
        const cvA = a.cvScore ?? a.aiScore ?? 0;
        const cvB = b.cvScore ?? b.aiScore ?? 0;
        return cvB - cvA;
      }
      if (sortBy === "date") {
        return b.createdAt - a.createdAt;
      }
      return 0;
    });
  }, [applications, searchTerm, isPreselectedOnly, sortBy]);

  const handleQuickShortlist = async (appId: string) => {
    try {
      await updateCandidateFinalEvaluation({
        id: appId as any,
        status: "hr_shortlisted",
        finalRecommendation: "strong_recommend_hr",
      });
      toast.success("Candidate shortlisted for HR Interview!");
    } catch (error: any) {
      console.error("Shortlist error:", error);
      toast.error(error?.message || "Failed to shortlist candidate");
    }
  };

  const handleRemoveShortlist = async (app: any) => {
    try {
      const targetStatus = typeof app.technicalScore === "number" ? "technical_passed" : "submitted";
      await updateCandidateFinalEvaluation({
        id: app._id as any,
        status: targetStatus,
        finalRecommendation: "reconsider_hr",
      });
      toast.success(`Removed ${app.fullName} from HR shortlist`);
    } catch (error: any) {
      console.error("Remove shortlist error:", error);
      toast.error(error?.message || "Failed to update candidate status");
    }
  };

  if (applications === undefined) return <LoaderUI />;

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Super Recruiter Candidates Leaderboard <TrophyIcon className="size-6 text-primary" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-stage candidate ranking with pre-interview CV scores, technical assessment scores, and AI HR recommendations.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            Interview Dashboard
          </Link>
        </Button>
      </div>

      {/* Search, Filter & Sorting Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sorting Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ArrowUpDownIcon className="size-3.5" /> Sort:
            </span>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
              <SelectTrigger className="w-[200px] h-9 text-xs bg-card">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="finalScore">⭐ Final AI Composite Score</SelectItem>
                <SelectItem value="techScore">💻 Technical Assessment Score</SelectItem>
                <SelectItem value="cvScore">📄 CV Screening Score</SelectItem>
                <SelectItem value="date">📅 Applied Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 transition-all cursor-pointer shadow-xs"
              variant={isPreselectedOnly ? "default" : "outline"}
              onClick={() => setIsPreselectedOnly((prev) => !prev)}
            >
              🎯 Pre-selected HR ({preselectedCount})
            </Button>
          </div>
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
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-5 py-3.5">Position</th>
                    <th className="px-4 py-3.5 text-center">📄 CV Score</th>
                    <th className="px-4 py-3.5 text-center">💻 Tech Score</th>
                    <th className="px-4 py-3.5 text-center">⭐ Final Score</th>
                    <th className="px-5 py-3.5">AI HR Recommendation</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredApplications.map((app) => {
                    const status = app.status as ApplicationStatus;
                    const cvScore = app.cvScore ?? app.aiScore;
                    const techScore = app.technicalScore;
                    const finalScore = app.finalScore ?? (cvScore && techScore ? Math.round(cvScore * 0.4 + techScore * 0.6) : cvScore);
                    const hrRec = app.finalRecommendation as FinalHrRecommendation | undefined;

                    return (
                      <tr key={app._id} className="hover:bg-secondary/20 transition-colors">
                        {/* Candidate Info */}
                        <td className="px-5 py-4">
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
                        <td className="px-5 py-4 font-semibold text-foreground">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium">
                            <BriefcaseIcon className="size-3 text-primary" />
                            {app.position}
                          </span>
                        </td>

                        {/* CV Score */}
                        <td className="px-4 py-4 text-center">
                          {typeof cvScore === "number" ? (
                            <span className="font-bold text-foreground text-sm">{cvScore} <span className="text-[10px] text-muted-foreground font-normal">/100</span></span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Pending</span>
                          )}
                        </td>

                        {/* Tech Score */}
                        <td className="px-4 py-4 text-center">
                          {typeof techScore === "number" ? (
                            <span className="font-bold text-primary text-sm">{techScore} <span className="text-[10px] text-muted-foreground font-normal">/100</span></span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Not Taken</span>
                          )}
                        </td>

                        {/* Final AI Score */}
                        <td className="px-4 py-4 text-center">
                          {typeof finalScore === "number" ? (
                            <div className="inline-flex items-center justify-center rounded-full bg-primary/15 px-3 py-1 text-primary font-black text-sm border border-primary/30">
                              {finalScore}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </td>

                        {/* HR Recommendation */}
                        <td className="px-5 py-4">
                          {hrRec ? (
                            <Badge variant={getFinalHrRecommendationVariant(hrRec)}>
                              {FINAL_HR_RECOMMENDATION_LABELS[hrRec]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pending Interview</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <Badge variant={getApplicationStatusVariant(status)}>
                            {APPLICATION_STATUS_LABELS[status]}
                          </Badge>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {app.status === "hr_shortlisted" || app.finalRecommendation === "strong_recommend_hr" || app.finalRecommendation === "recommend_hr" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                                onClick={() => handleRemoveShortlist(app)}
                                title="Deny shortlist / Remove from Pre-selected HR"
                              >
                                <UserXIcon className="size-3.5" /> Deny Shortlist
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                                onClick={() => handleQuickShortlist(app._id)}
                                title="Shortlist for HR Interview"
                              >
                                <UserCheckIcon className="size-3.5" /> Shortlist
                              </Button>
                            )}
                            <Button asChild size="sm" className="h-8 text-xs">
                              <Link href={`/dashboard/applications/${app._id}`}>
                                Review <ChevronRightIcon className="size-3.5" />
                              </Link>
                            </Button>
                          </div>
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
