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
import { CalendarIcon, CheckCircle2Icon, ClockIcon, VideoIcon, XCircleIcon } from "lucide-react";
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
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
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
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 rounded-lg border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Evaluation Desk
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Interview Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor active interviews, review candidate outcomes, and record hiring signals.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard/applications">Review Applications</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/jobs">Manage Jobs</Link>
          </Button>
          <Button asChild>
            <Link href="/schedule">Schedule New Interview</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {INTERVIEW_CATEGORY.map(
          (category) =>
            groupedInterviews[category.id]?.length > 0 && (
              <section key={category.id}>
                {/* CATEGORY TITLE */}
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight">{category.title}</h2>
                  <Badge variant={category.variant}>{groupedInterviews[category.id].length}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        className="overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                      >
                        <div className="h-1 bg-gradient-to-r from-primary via-accent to-fuchsia-400" />
                        {/* CANDIDATE INFO */}
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border">
                              <AvatarImage src={candidateInfo.image} />
                              <AvatarFallback>{candidateInfo.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">{candidateInfo.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{interview.title}</p>
                            </div>
                          </div>
                        </CardHeader>

                        {/* DATE &  TIME */}
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {format(startTime, "MMM dd")}
                            </div>
                            <div className="flex items-center gap-1">
                              <ClockIcon className="h-4 w-4" />
                              {format(startTime, "hh:mm a")}
                            </div>
                          </div>
                        </CardContent>

                        {/* PASS & FAIL BUTTONS */}
                        <CardFooter className="p-4 pt-0 flex flex-col gap-3">
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
                                className="flex-1"
                                onClick={() => handleStatusUpdate(interview._id, "succeeded")}
                              >
                                <CheckCircle2Icon className="h-4 w-4 mr-2" />
                                Pass
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleStatusUpdate(interview._id, "failed")}
                              >
                                <XCircleIcon className="h-4 w-4 mr-2" />
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
