import { Call } from "@stream-io/video-react-sdk";
import { format } from "date-fns";
import {
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  PhoneCallIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type CallCardProps = {
  call: Call;
  canManage?: boolean;
  recordingCount?: number;
  onDeleteCall?: (callId: string) => Promise<void>;
};

function formatDate(date?: Date) {
  return date ? format(date, "MMM d, yyyy, hh:mm a") : "Not scheduled";
}

function getCallStatus(call: Call) {
  const now = Date.now();
  const startsAt = call.state.startsAt?.getTime();
  const endedAt = call.state.endedAt;

  if (endedAt) return "Ended";
  if (startsAt && startsAt > now) return "Upcoming";
  if (startsAt && startsAt <= now) return "Live or started";
  return "Created";
}

function CallCard({ call, canManage = false, recordingCount = 0, onDeleteCall }: CallCardProps) {
  const [isDeletingCall, setIsDeletingCall] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const shortCallId = call.id.slice(0, 8);
  const status = getCallStatus(call);

  const handleDeleteCall = async () => {
    if (!onDeleteCall) return;

    setIsDeletingCall(true);

    try {
      await onDeleteCall(call.id);
      setIsConfirmOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete call");
    } finally {
      setIsDeletingCall(false);
    }
  };

  return (
    <>
      <Card className="group overflow-hidden transition-all hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5">
        <CardHeader className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md border border-accent/25 bg-accent/10">
                <PhoneCallIcon className="size-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold">Stream Call</p>
                <p className="text-xs text-muted-foreground">Call {shortCallId}</p>
              </div>
            </div>
            <div className="rounded-md border border-border/70 bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {status}
            </div>
          </div>

          <div className="grid gap-2 rounded-md border border-border/60 bg-background/45 p-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
              <span>{formatDate(call.state.startsAt ?? call.state.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClockIcon className="h-3.5 w-3.5 text-primary" />
              <span>{call.state.endedAt ? `Ended ${formatDate(call.state.endedAt)}` : "No end time"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5 text-primary" />
              <span>{recordingCount} {recordingCount === 1 ? "recording" : "recordings"}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5">
          <div className="rounded-md border border-border/70 bg-background/55 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">CID</p>
            <p className="mt-2 break-all font-mono text-xs leading-relaxed text-foreground/90">
              {call.cid}
            </p>
          </div>
        </CardContent>

        {canManage && (
          <CardFooter className="border-t border-border/60 bg-background/35 p-5">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isDeletingCall}
            >
              <Trash2Icon className="size-4" />
              Delete Call
            </Button>
          </CardFooter>
        )}
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="overflow-hidden border-border/80 bg-card p-0 shadow-2xl shadow-black/45 sm:max-w-[500px]">
          <div className="relative px-6 pb-5 pt-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
            <DialogHeader className="grid grid-cols-[auto_1fr] gap-4 pr-8 text-left">
              <div className="relative flex size-12 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10">
                <span className="absolute inset-0 rounded-full bg-destructive/10 blur-md" />
                <AlertTriangleIcon className="relative size-5 text-destructive" />
              </div>
              <div className="min-w-0 space-y-2">
                <DialogTitle className="text-xl leading-tight">Delete Entire Call?</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  This permanently removes the Stream call, recordings, sessions, and local interview data.
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-3 px-6 pb-6">
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Use this only for test or incorrect meetings. This action cannot be undone.
              </p>
            </div>
            <div className="rounded-md border border-border/70 bg-background/55 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Target</p>
                <p className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  Call
                </p>
              </div>
              <p className="break-all font-mono text-xs leading-relaxed text-foreground/90">
                {call.cid}
              </p>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 border-t border-border/70 bg-background/45 px-6 py-4 sm:space-x-0">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isDeletingCall}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDeleteCall}
              disabled={isDeletingCall}
            >
              <Trash2Icon className="size-4" />
              {isDeletingCall ? "Deleting..." : "Delete Call"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CallCard;
