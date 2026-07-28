import { CallRecording } from "@stream-io/video-react-sdk";
import { useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { calculateRecordingDuration } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import {
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  FileVideoIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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
  const [confirmAction, setConfirmAction] = useState<"recording" | "call" | null>(null);

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

    setIsDeletingRecording(true);

    try {
      await onDeleteRecording(recording);
      setConfirmAction(null);
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

    setIsDeletingCall(true);

    try {
      await onDeleteCall(recording.callId);
      setConfirmAction(null);
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
  const isDeleting = isDeletingRecording || isDeletingCall;
  const confirmContent =
    confirmAction === "call"
      ? {
          title: "Delete Entire Call?",
          description:
            "This permanently removes the Stream call, all recordings, sessions, and local interview data.",
          detail: "Use this only for test or incorrect meetings.",
          buttonLabel: "Delete Call",
          onConfirm: handleDeleteCall,
        }
      : {
          title: "Delete Recording?",
          description: "This permanently removes only this recording file from Stream.",
          detail: "The meeting, interview data, comments, and other recordings stay available.",
          buttonLabel: "Delete Recording",
          onConfirm: handleDeleteRecording,
        };

  return (
    <>
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
            <Button
              variant="secondary"
              size="icon"
              onClick={handleCopyLink}
              aria-label="Copy recording link"
            >
              <CopyIcon className="size-4" />
            </Button>
          </div>

          {canManage && (
            <div className="grid grid-cols-2 gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-2">
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/25 text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmAction("recording")}
                disabled={isDeleting}
              >
                <Trash2Icon className="size-4" />
                Recording
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmAction("call")}
                disabled={isDeleting}
              >
                <Trash2Icon className="size-4" />
                Call
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="overflow-hidden border-border/80 bg-card p-0 shadow-2xl shadow-black/45 sm:max-w-[500px]">
          <div className="relative px-6 pb-5 pt-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
            <DialogHeader className="grid grid-cols-[auto_1fr] gap-4 pr-8 text-left">
              <div className="relative flex size-12 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10">
                <span className="absolute inset-0 rounded-full bg-destructive/10 blur-md" />
                <AlertTriangleIcon className="relative size-5 text-destructive" />
              </div>
              <div className="min-w-0 space-y-2">
                <DialogTitle className="text-xl leading-tight">{confirmContent.title}</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  {confirmContent.description}
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-3 px-6 pb-6">
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{confirmContent.detail}</p>
            </div>
            <div className="rounded-md border border-border/70 bg-background/55 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Target</p>
                <p className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {confirmAction === "call" ? "Call" : "Recording"}
                </p>
              </div>
              <p className="break-all font-mono text-xs leading-relaxed text-foreground/90">
                {confirmAction === "call" ? recording.callCid : recording.filename}
              </p>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 border-t border-border/70 bg-background/45 px-6 py-4 sm:space-x-0">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setConfirmAction(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={confirmContent.onConfirm}
              disabled={isDeleting}
            >
              <Trash2Icon className="size-4" />
              {isDeleting ? "Deleting..." : confirmContent.buttonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default RecordingCard;
