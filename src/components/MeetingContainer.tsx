"use client";

import { useState } from "react";
import { Call, CallingState, StreamCall, StreamTheme, useCallStateHooks } from "@stream-io/video-react-sdk";
import MeetingSetup from "./MeetingSetup";
import MeetingRoom from "./MeetingRoom";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "./ui/button";

function MeetingContent() {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState === CallingState.LEFT) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-4 shadow-lg">
          <div className="size-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2Icon className="size-8" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            Assessment Completed & Submitted!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you for completing your technical interview. Your code submission and proctoring session recording have been securely sent to the recruiter team for review.
          </p>
          <div className="py-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 py-1.5 px-3 rounded-full border border-emerald-500/30">
              ✨ You can safely close this tab now
            </span>
          </div>
          <div className="pt-2 text-xs text-muted-foreground">
            Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Under Recruiter Evaluation</span>
          </div>
        </div>
      </div>
    );
  }

  return !isSetupComplete ? (
    <MeetingSetup onSetupComplete={() => setIsSetupComplete(true)} />
  ) : (
    <MeetingRoom />
  );
}

export default function MeetingContainer({ call }: { call: Call }) {
  if (!call) return null;

  return (
    <StreamCall call={call}>
      <StreamTheme>
        <MeetingContent />
      </StreamTheme>
    </StreamCall>
  );
}
