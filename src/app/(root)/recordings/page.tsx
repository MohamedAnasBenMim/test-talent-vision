"use client";

import { deleteStreamCall, deleteStreamRecording } from "@/actions/recording.actions";
import CallCard from "@/components/CallCard";
import LoaderUI from "@/components/LoaderUI";
import RecordingCard, { RecordingWithCall } from "@/components/RecordingCard";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "../../../../convex/_generated/api";
import useGetCalls from "@/hooks/useGetCalls";
import { useUserRole } from "@/hooks/useUserRole";
import { useMutation } from "convex/react";
import { FileVideoIcon, PhoneCallIcon, ShieldCheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function RecordingsPage() {
  const { calls, isLoading } = useGetCalls();
  const { isInterviewer } = useUserRole();
  const deleteInterviewByStreamCallId = useMutation(api.interviews.deleteByStreamCallId);
  const [recordings, setRecordings] = useState<RecordingWithCall[]>([]);
  const [activeView, setActiveView] = useState<"recordings" | "calls">("recordings");

  useEffect(() => {
    const fetchRecordings = async () => {
      if (!calls) return;

      try {
        const callData = await Promise.all(
          calls.map(async (call) => {
            const { recordings } = await call.listRecordings();

            return recordings.map((recording) => ({
              ...recording,
              callId: call.id,
              callCid: call.cid,
            }));
          })
        );
        const allRecordings = callData.flat();

        setRecordings(allRecordings);
      } catch (error) {
        console.log("Error fetching recordings:", error);
      }
    };

    fetchRecordings();
  }, [calls]);

  const handleDeleteRecording = async (recording: RecordingWithCall) => {
    await deleteStreamRecording({
      callId: recording.callId,
      sessionId: recording.session_id,
      filename: recording.filename,
    });

    setRecordings((current) =>
      current.filter(
        (item) =>
          item.callId !== recording.callId ||
          item.session_id !== recording.session_id ||
          item.filename !== recording.filename
      )
    );
  };

  const handleDeleteCall = async (callId: string) => {
    await deleteStreamCall({ callId });
    await deleteInterviewByStreamCallId({ streamCallId: callId });

    setRecordings((current) => current.filter((item) => item.callId !== callId));
    toast.success("Call deleted permanently");
  };

  if (isLoading) return <LoaderUI />;

  const callCount = calls?.length ?? 0;
  const recordingCountsByCall = recordings.reduce<Record<string, number>>((counts, recording) => {
    counts[recording.callId] = (counts[recording.callId] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-6 rounded-lg border border-border/70 bg-card/70 p-5 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10">
              <FileVideoIcon className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Media Manager</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {recordings.length} {recordings.length === 1 ? "recording" : "recordings"} and{" "}
                {callCount} {callCount === 1 ? "call" : "calls"} available
              </p>
            </div>
          </div>

          {isInterviewer && (
            <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <ShieldCheckIcon className="size-4 text-primary" />
              Interviewer management
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 inline-grid grid-cols-2 gap-1 rounded-md border border-border/70 bg-background/70 p-1">
        <Button
          variant={activeView === "recordings" ? "default" : "ghost"}
          className="gap-2"
          onClick={() => setActiveView("recordings")}
        >
          <FileVideoIcon className="size-4" />
          Recordings
          <span className="rounded-sm bg-background/30 px-1.5 py-0.5 text-xs">
            {recordings.length}
          </span>
        </Button>
        <Button
          variant={activeView === "calls" ? "default" : "ghost"}
          className="gap-2"
          onClick={() => setActiveView("calls")}
        >
          <PhoneCallIcon className="size-4" />
          Calls
          <span className="rounded-sm bg-background/30 px-1.5 py-0.5 text-xs">
            {callCount}
          </span>
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-13.5rem)]">
        {activeView === "recordings" && recordings.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 pb-6 lg:grid-cols-2 2xl:grid-cols-3">
            {recordings.map((r) => (
              <RecordingCard
                key={`${r.callId}-${r.session_id}-${r.filename}`}
                recording={r}
                canManage={Boolean(isInterviewer)}
                onDeleteCall={handleDeleteCall}
                onDeleteRecording={handleDeleteRecording}
              />
            ))}
          </div>
        ) : activeView === "calls" && callCount > 0 ? (
          <div className="grid grid-cols-1 gap-6 pb-6 lg:grid-cols-2 2xl:grid-cols-3">
            {calls?.map((call) => (
              <CallCard
                key={call.cid}
                call={call}
                canManage={Boolean(isInterviewer)}
                recordingCount={recordingCountsByCall[call.id] ?? 0}
                onDeleteCall={handleDeleteCall}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] gap-4">
            <p className="text-xl font-medium text-muted-foreground">
              No {activeView === "recordings" ? "recordings" : "calls"} available
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
export default RecordingsPage;
