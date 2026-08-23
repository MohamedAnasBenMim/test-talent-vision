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
            Assessment Completed!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your technical assessment code and proctoring recording have been saved successfully for recruiter review.
          </p>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => (window.location.href = "/")}>
            Return to Dashboard
          </Button>
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
