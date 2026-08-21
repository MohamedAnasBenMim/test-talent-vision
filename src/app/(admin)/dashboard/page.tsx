"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import toast from "react-hot-toast";
import LoaderUI from "@/components/LoaderUI";
import { getCandidateInfo, getMeetingStatus, groupInterviews } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { INTERVIEW_CATEGORY } from "@/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  PlusIcon,
  VideoIcon,
  XCircleIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { format } from "date-fns";
import CommentDialog from "@/components/CommentDialog";
import useMeetingActions from "@/hooks/useMeetingActions";
import { useEffect, useState } from "react";

type Interview = Doc<"interviews">;

function DashboardPage() {
  const users = useQuery(api.users.getUsers);
  const interviews = useQuery(api.interviews.getAllInterviews);
  const updateStatus = useMutation(api.interviews.updateInterviewStatus);
  const { joinMeeting } = useMeetingActions();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (interviewId: Id<"interviews">, status: string) => {
    try {
      await updateStatus({ id: interviewId, status });
      toast.success(`Interview marked as ${status}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (!interviews || !users) return <LoaderUI />;

  const groupedInterviews = groupInterviews(interviews);

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Interviews
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage technical interview calls, join live sessions, and submit evaluation scorecards.
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
            <Link href="/schedule">
              <PlusIcon className="size-4" />
              Schedule Interview
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {INTERVIEW_CATEGORY.map(
          (category) =>
            groupedInterviews[category.id]?.length > 0 && (
              <section key={category.id} className="space-y-4">
                {/* CATEGORY TITLE */}
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">{category.title}</h2>
                  <Badge variant={category.variant as any}>{groupedInterviews[category.id].length}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {groupedInterviews[category.id].map((interview: Interview) => {
                    const candidateInfo = getCandidateInfo(users, interview.candidateId, {
                      name: interview.candidateName,
                      email: interview.candidateEmail,
                    });
                    const startTime = new Date(interview.startTime);
                    const status = getMeetingStatus(interview, new Date(now));

                    return (
                      <Card
                        key={interview._id}
                        className="group hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <CardHeader className="p-5 pb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border">
                              <AvatarImage src={candidateInfo.image} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                {candidateInfo.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <CardTitle className="text-base font-bold truncate group-hover:text-primary transition-colors">
                                {candidateInfo.name}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground truncate">{interview.title}</p>
                            </div>
                          </div>
                        </CardHeader>

                        {/* DATE & TIME */}
                        <CardContent className="px-5 py-3 space-y-2">
                          <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="size-3.5 text-primary" />
                              {format(startTime, "MMM dd, yyyy")}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <ClockIcon className="size-3.5 text-primary" />
                              {format(startTime, "hh:mm a")}
                            </div>
                          </div>
                        </CardContent>

                        {/* ACTIONS */}
                        <CardFooter className="p-5 pt-3 border-t border-border/60 bg-secondary/15 flex flex-col gap-2.5 rounded-b-xl">
                          {status === "live" && (
                            <Button
                              className="w-full gap-2"
                              onClick={() => joinMeeting(interview.streamCallId)}
                            >
                              <VideoIcon className="size-4" />
                              Enter Meeting
                            </Button>
                          )}

                          {interview.status === "completed" && (
                            <div className="flex gap-2 w-full">
                              <Button
                                size="sm"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleStatusUpdate(interview._id, "succeeded")}
                              >
                                <CheckCircle2Icon className="size-4 mr-1.5" />
                                Pass
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleStatusUpdate(interview._id, "failed")}
                              >
                                <XCircleIcon className="size-4 mr-1.5" />
                                Fail
                              </Button>
                            </div>
                          )}
                          <CommentDialog interviewId={interview._id} />
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )
        )}
      </div>
    </div>
  );
}
export default DashboardPage;
