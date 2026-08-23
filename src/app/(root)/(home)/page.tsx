"use client";

import ActionCard from "@/components/ActionCard";
import { QUICK_ACTIONS } from "@/constants";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import MeetingModal from "@/components/MeetingModal";
import LoaderUI from "@/components/LoaderUI";
import {
  CalendarXIcon,
  BriefcaseIcon,
  UsersIcon,
  VideoIcon,
  SparklesIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  PlusIcon,
  TrendingUpIcon,
  ActivityIcon,
} from "lucide-react";
import { getMeetingStatus } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  const { isInterviewer, isCandidate, isLoading } = useUserRole();
  const interviews = useQuery(api.interviews.getMyInterviews);
  const jobs = useQuery(api.applications.getJobs, isInterviewer ? {} : "skip");
  const applications = useQuery(api.applications.getApplications, isInterviewer ? {} : "skip");
  const allInterviews = useQuery(api.interviews.getAllInterviews, isInterviewer ? {} : "skip");

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"start" | "join">();

  const completedInterview = useMemo(() => {
    if (!isCandidate || !interviews) return undefined;
    return interviews.find((interview) => interview.status === "completed");
  }, [interviews, isCandidate]);

  const candidateNextInterview = useMemo(() => {
    if (!isCandidate || !interviews) return undefined;

    const now = new Date();

    return interviews
      .filter((interview) => {
        const status = getMeetingStatus(interview, now);
        return status === "live" || status === "upcoming";
      })
      .sort((a, b) => a.startTime - b.startTime)[0];
  }, [interviews, isCandidate]);

  useEffect(() => {
    if (!isCandidate || !candidateNextInterview) return;

    router.replace(`/meeting/${candidateNextInterview.streamCallId}`);
  }, [candidateNextInterview, isCandidate, router]);

  const handleQuickAction = (title: string) => {
    switch (title) {
      case "New Call":
        setModalType("start");
        setShowModal(true);
        break;
      case "Join Interview":
        setModalType("join");
        setShowModal(true);
        break;
      case "Schedule":
        router.push("/schedule");
        break;
      default:
        router.push("/");
    }
  };

  // Metrics computation
  const totalJobsCount = jobs?.length ?? 0;
  const totalApplicationsCount = applications?.length ?? 0;
  const totalInterviewsCount = allInterviews?.length ?? 0;
  const avgScore = useMemo(() => {
    if (!applications || applications.length === 0) return 0;
    const scored = applications.filter((a) => typeof a.aiScore === "number");
    if (scored.length === 0) return 0;
    const sum = scored.reduce((acc, a) => acc + (a.aiScore ?? 0), 0);
    return Math.round(sum / scored.length);
  }, [applications]);

  // Hiring pipeline stats
  const pipelineStats = useMemo(() => {
    if (!applications) return { applied: 0, screening: 0, interview: 0, passed: 0 };
    return {
      applied: applications.filter((a) => a.status === "submitted" || a.status === "cv_analyzing").length,
      screening: applications.filter((a) => a.status === "cv_review_required" || a.status === "saved_to_talent_pool").length,
      interview: applications.filter((a) => a.status === "technical_invited").length,
      passed: applications.filter((a) => a.status === "technical_passed").length,
    };
  }, [applications]);

  if (isLoading) return <LoaderUI />;

  if (isCandidate) {
    if (interviews === undefined || candidateNextInterview) return <LoaderUI />;

    if (completedInterview) {
      return (
        <div className="container mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center p-6">
          <section className="w-full rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center shadow-lg space-y-5">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-500">
              <CheckCircle2Icon className="size-9" />
            </div>
            <div className="space-y-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Completed & Submitted
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                Technical Assessment Completed!
              </h1>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                Thank you for completing your technical interview for <strong className="text-foreground">{completedInterview.title}</strong>. Your code submission and proctoring session recording have been securely sent to the recruiter team for review.
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 py-1.5 px-3 rounded-full border border-emerald-500/30">
                  ✨ You can safely close this tab now
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-emerald-500/20 text-xs text-muted-foreground">
              Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Under Recruiter Evaluation</span>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="container mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center justify-center p-6">
        <section className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarXIcon className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">No Active Interview Invitation</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            You do not have an active technical interview yet. When an interviewer sends you an
            invitation link, open it to take your assessment.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header Greeting Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Hi there! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here is your recruitment activity overview and hiring pipeline performance.
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
              Create Position
            </Link>
          </Button>
        </div>
      </div>

      {/* Super Recruiter Top Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Stat Card 1 */}
        <Card className="hover:border-primary/40 hover:shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Positions
              </p>
              <p className="mt-2 text-3xl font-extrabold text-foreground">{totalJobsCount}</p>
              <Link
                href="/dashboard/jobs"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View positions <ChevronRightIcon className="size-3" />
              </Link>
            </div>
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <BriefcaseIcon className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Stat Card 2 */}
        <Card className="hover:border-primary/40 hover:shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Candidates
              </p>
              <p className="mt-2 text-3xl font-extrabold text-foreground">{totalApplicationsCount}</p>
              <Link
                href="/dashboard/applications"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View all candidates <ChevronRightIcon className="size-3" />
              </Link>
            </div>
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UsersIcon className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Stat Card 3 */}
        <Card className="hover:border-primary/40 hover:shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming Interviews
              </p>
              <p className="mt-2 text-3xl font-extrabold text-foreground">{totalInterviewsCount}</p>
              <Link
                href="/schedule"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View schedule <ChevronRightIcon className="size-3" />
              </Link>
            </div>
            <div className="grid size-12 place-items-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <VideoIcon className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Stat Card 4 */}
        <Card className="hover:border-primary/40 hover:shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avg AI Quality Score
              </p>
              <p className="mt-2 text-3xl font-extrabold text-foreground">{avgScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
              <Link
                href="/dashboard/ai-insights"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                AI Insights <ChevronRightIcon className="size-3" />
              </Link>
            </div>
            <div className="grid size-12 place-items-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <SparklesIcon className="size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Position Health Scorecard */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-lg font-bold">Position Health Scorecard</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live status and candidate match ratings across open requisitions.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/jobs">
              View All Positions <ArrowUpRightIcon className="size-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground font-semibold border-y border-border">
                <tr>
                  <th className="px-6 py-3">Position Name</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Applications</th>
                  <th className="px-6 py-3">Avg Match Score</th>
                  <th className="px-6 py-3">Health Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs && jobs.length > 0 ? (
                  jobs.slice(0, 5).map((job) => {
                    const jobApps = applications?.filter((a) => a.jobId === job.jobId) ?? [];
                    const scoredApps = jobApps.filter((a) => typeof a.aiScore === "number");
                    const jobAvgScore =
                      scoredApps.length > 0
                        ? Math.round(scoredApps.reduce((acc, a) => acc + (a.aiScore ?? 0), 0) / scoredApps.length)
                        : 75;

                    return (
                      <tr key={job._id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-6 py-4 font-semibold text-foreground">
                          {job.title}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {job.location || "Remote"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-foreground">
                          {jobApps.length} candidates
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{jobAvgScore}%</span>
                            <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${jobAvgScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={jobAvgScore >= 70 ? "success" : "warning"}>
                            {jobAvgScore >= 70 ? "Good Pool" : "Low Quality"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/dashboard/jobs/${job.jobId}`}>
                              Manage <ChevronRightIcon className="size-3.5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No open positions defined yet. Click "Create Position" above to add one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Hiring Workbench & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline Summary Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ActivityIcon className="size-5 text-primary" />
              Hiring Workbench Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">Inbound</p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">{pipelineStats.applied}</p>
                <Badge variant="outline" className="mt-2 text-[10px]">Applied</Badge>
              </div>
              <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">AI Screening</p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">{pipelineStats.screening}</p>
                <Badge variant="default" className="mt-2 text-[10px]">Shortlisted</Badge>
              </div>
              <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">Interviewing</p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">{pipelineStats.interview}</p>
                <Badge variant="info" className="mt-2 text-[10px]">Invited</Badge>
              </div>
              <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">Passed</p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">{pipelineStats.passed}</p>
                <Badge variant="success" className="mt-2 text-[10px]">Qualified</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Funnel Conversion Rate (Inbound → Qualified)</span>
                <span className="text-primary font-bold">64% Overall Match</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden flex">
                <div className="bg-primary h-full" style={{ width: '40%' }} />
                <div className="bg-sky-500 h-full" style={{ width: '25%' }} />
                <div className="bg-emerald-500 h-full" style={{ width: '20%' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Super Recruiter Quick Launch Card */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <SparklesIcon className="size-5 text-primary" />
              Recruiter Quick Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-secondary/40 hover:border-primary/40 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <action.icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <MeetingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === "join" ? "Join Meeting" : "Start Meeting"}
        isJoinMeeting={modalType === "join"}
      />
    </div>
  );
}
