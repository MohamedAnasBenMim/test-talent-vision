"use client";

import { api } from "../../../../../convex/_generated/api";
import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import LoaderUI from "@/components/LoaderUI";
import MeetingRoom from "@/components/MeetingRoom";
import MeetingSetup from "@/components/MeetingSetup";
import useGetCallById from "@/hooks/useGetCallById";
import { getMeetingStatus } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { StreamCall, StreamTheme } from "@stream-io/video-react-sdk";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { CalendarIcon, ClockIcon, VideoIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function formatStartsIn(startTime: number, now: number) {
  const remainingMs = Math.max(0, startTime - now);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function MeetingPage() {
  const { id } = useParams();
  const { isLoaded } = useUser();
  const streamCallId = Array.isArray(id) ? id[0] : id;
  const { call, isCallLoading } = useGetCallById(streamCallId);
  const interview = useQuery(
    api.interviews.getInterviewByStreamCallId,
    streamCallId ? { streamCallId } : "skip"
  );

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isEntryConfirmed, setIsEntryConfirmed] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!isLoaded || isCallLoading || interview === undefined) return <LoaderUI />;

  if (!call) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-2xl font-semibold">Meeting not found</p>
      </div>
    );
  }

  if (interview) {
    const status = getMeetingStatus(interview, new Date(now));

    if (status === "completed") {
      return (
        <InterviewEntryGate
          title={interview.title}
          description="This interview window has ended."
          scheduledAt={interview.startTime}
          status="completed"
          startsIn="Time ended"
          onEnter={() => {}}
        />
      );
    }

    if (!isEntryConfirmed) {
      return (
        <InterviewEntryGate
          title={interview.title}
          description={interview.description ?? "Your technical interview is scheduled."}
          scheduledAt={interview.startTime}
          status={status}
          startsIn={formatStartsIn(interview.startTime, now)}
          onEnter={() => setIsEntryConfirmed(true)}
        />
      );
    }
  }

  return (
    <StreamCall call={call}>
      <StreamTheme>
        {!isSetupComplete ? (
          <MeetingSetup onSetupComplete={() => setIsSetupComplete(true)} />
        ) : (
          <MeetingRoom />
        )}
      </StreamTheme>
    </StreamCall>
  );
}

function InterviewEntryGate({
  title,
  description,
  scheduledAt,
  status,
  startsIn,
  onEnter,
}: {
  title: string;
  description: string;
  scheduledAt: number;
  status: "upcoming" | "live" | "completed";
  startsIn: string;
  onEnter: () => void;
}) {
  const isLive = status === "live";
  const isCompleted = status === "completed";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-3xl overflow-hidden rounded-lg border border-border/70 bg-card/85 shadow-2xl shadow-black/30">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-fuchsia-400" />
        <div className="space-y-8 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />
            <div className="rounded-md border border-border/70 bg-background/65 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {isLive ? "Ready" : isCompleted ? "Closed" : "Waiting Room"}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Technical Interview
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-background/55 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="size-4 text-primary" />
                Scheduled time
              </div>
              <p className="mt-2 font-semibold">
                {format(new Date(scheduledAt), "EEEE, MMMM d · h:mm a")}
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-background/55 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClockIcon className="size-4 text-primary" />
                {isLive ? "Interview is open" : isCompleted ? "Status" : "Opens in"}
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-primary">
                {isLive ? "Now" : startsIn}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/45 p-4 text-sm text-muted-foreground">
            {isLive
              ? "You can enter the interview now. Camera and microphone setup appears before joining the room."
              : isCompleted
                ? "This interview can no longer be joined from the invitation link."
                : "Keep this page open. The button will enable automatically when the scheduled time arrives."}
          </div>

          <Button className="w-full gap-2" size="lg" disabled={!isLive} onClick={onEnter}>
            <VideoIcon className="size-4" />
            {isLive ? "Enter Interview" : isCompleted ? "Interview Closed" : `Available in ${startsIn}`}
          </Button>
        </div>
      </section>
    </main>
  );
}

export default MeetingPage;
