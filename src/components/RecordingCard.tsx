import { CallRecording } from "@stream-io/video-react-sdk";
import { useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { calculateRecordingDuration } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import {
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  FileVideoIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "./ui/button";

export type RecordingWithCall = CallRecording & {
  callId: string;
  callCid: string;
};

type RecordingCardProps = {
  recording: RecordingWithCall;
  canManage?: boolean;
  onDeleteRecording?: (recording: RecordingWithCall) => Promise<void>;
  onDeleteCall?: (callId: string) => Promise<void>;
};

function RecordingCard({
  recording,
  canManage = false,
  onDeleteCall,
  onDeleteRecording,
}: RecordingCardProps) {
  const [isDeletingRecording, setIsDeletingRecording] = useState(false);
  const [isDeletingCall, setIsDeletingCall] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(recording.url);
      toast.success("Recording link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link to clipboard");
    }
  };

  const handleDeleteRecording = async () => {
    if (!onDeleteRecording) return;
    if (!window.confirm("Delete this recording permanently from Stream?")) return;

    setIsDeletingRecording(true);

    try {
      await onDeleteRecording(recording);
      toast.success("Recording deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete recording");
    } finally {
      setIsDeletingRecording(false);
    }
  };

  const handleDeleteCall = async () => {
    if (!onDeleteCall) return;
    if (
      !window.confirm(
        "Permanently delete this call, its recordings, sessions, and local interview data?"
      )
    ) {
      return;
    }

    setIsDeletingCall(true);

    try {
      await onDeleteCall(recording.callId);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete call");
    } finally {
      setIsDeletingCall(false);
    }
  };

  const formattedStartTime = recording.start_time
    ? format(new Date(recording.start_time), "MMM d, yyyy, hh:mm a")
    : "Unknown";

  const duration =
    recording.start_time && recording.end_time
      ? calculateRecordingDuration(recording.start_time, recording.end_time)
      : "Unknown duration";
  const shortCallId = recording.callId.slice(0, 8);

  return (
    <Card className="group overflow-hidden transition-all hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border border-primary/25 bg-primary/10">
              <FileVideoIcon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Interview Recording</p>
              <p className="text-xs text-muted-foreground">Call {shortCallId}</p>
            </div>
          </div>
          <div className="rounded-md border border-border/70 bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {duration}
          </div>
        </div>

        <div className="grid gap-2 rounded-md border border-border/60 bg-background/45 p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            <span>{formattedStartTime}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClockIcon className="h-3.5 w-3.5 text-primary" />
            <span>{duration}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <div
          className="flex aspect-video w-full cursor-pointer items-center justify-center rounded-md border border-border/60 bg-muted/35 transition-colors group-hover:bg-muted/55"
          onClick={() => window.open(recording.url, "_blank")}
        >
          <div className="flex size-14 items-center justify-center rounded-full border border-border/70 bg-background/90 shadow-sm transition-colors group-hover:border-primary group-hover:bg-primary">
            <PlayIcon className="size-6 text-muted-foreground transition-colors group-hover:text-primary-foreground" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 border-t border-border/60 bg-background/35 p-5">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button onClick={() => window.open(recording.url, "_blank")}>
            <PlayIcon className="size-4" />
            Play Recording
          </Button>
          <Button variant="secondary" size="icon" onClick={handleCopyLink} aria-label="Copy recording link">
            <CopyIcon className="size-4" />
          </Button>
        </div>

        {canManage && (
          <div className="grid grid-cols-2 gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-2">
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/25 text-destructive hover:bg-destructive/10"
              onClick={handleDeleteRecording}
              disabled={isDeletingRecording || isDeletingCall}
            >
              <Trash2Icon className="size-4" />
              Recording
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteCall}
              disabled={isDeletingRecording || isDeletingCall}
            >
              <Trash2Icon className="size-4" />
              Call
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
export default RecordingCard;
