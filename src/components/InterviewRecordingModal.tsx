"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileVideoIcon, Loader2Icon, CameraIcon, VideoIcon } from "lucide-react";

interface InterviewRecordingModalProps {
  interviewId: Id<"interviews">;
  candidateName: string;
  title: string;
}

export default function InterviewRecordingModal({
  interviewId,
  candidateName,
  title,
}: InterviewRecordingModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only fire the Convex query when the modal is open
  const assessmentReport = useQuery(
    api.assessments.getAssessmentReportByInterview,
    isOpen ? { interviewId } : "skip"
  );

  const isLoading = isOpen && assessmentReport === undefined;
  const recordingUrl = assessmentReport?.recording?.url;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full gap-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
      >
        <FileVideoIcon className="size-3.5 text-primary" />
        View Recording
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <VideoIcon className="size-5 text-primary" />
              Interview Recording: {candidateName}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{title}</p>
          </DialogHeader>

          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                <Loader2Icon className="size-5 animate-spin text-primary" />
                <span className="text-sm font-medium">Loading recording...</span>
              </div>
            ) : recordingUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CameraIcon className="size-3.5" /> Candidate Technical Assessment Recording
                  </span>
                  <Badge variant="outline">Webcam Proctoring</Badge>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <video
                    controls
                    preload="metadata"
                    src={recordingUrl}
                    className="w-full aspect-video rounded-lg border border-border/80 bg-black"
                  />
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-border/70 bg-secondary/10 space-y-2">
                <FileVideoIcon className="mx-auto size-10 text-muted-foreground/40" />
                <p className="text-sm font-bold text-foreground">No Recording Available</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  The candidate has not completed a technical assessment for this interview yet, or the webcam recording was not saved.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
