import {
  CallControls,
  CallingState,
  CallParticipantsList,
  CancelCallButton,
  PaginatedGridLayout,
  SpeakerLayout,
  SpeakingWhileMutedNotification,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { LayoutListIcon, LoaderIcon, LogOutIcon, ShieldCheckIcon, UsersIcon, VideoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import CodeEditor from "./CodeEditor";
import { useUserRole } from "@/hooks/useUserRole";

function MeetingRoom() {
  const router = useRouter();
  const [layout, setLayout] = useState<"grid" | "speaker">("speaker");
  const [showParticipants, setShowParticipants] = useState(false);
  const { useCallCallingState, useCameraState, useMicrophoneState } = useCallStateHooks();
  const { isCandidate, isInterviewer } = useUserRole();

  const callingState = useCallCallingState();
  const cameraState = useCameraState();
  const micState = useMicrophoneState();

  useEffect(() => {
    if (isCandidate && cameraState.isMute) {
      toast.error("Camera is required! Please keep your camera turned on during the technical interview.", {
        id: "candidate-camera-toast",
      });
    }
  }, [isCandidate, cameraState.isMute]);

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoaderIcon className="size-6 animate-spin" />
      </div>
    );
  }

  // Autonomous Candidate Proctoring Layout (HR is not present live)
  if (isCandidate) {
    return (
      <div className="h-[calc(100vh-4rem-1px)] bg-background">
        <ResizablePanelGroup direction="horizontal">
          {/* SIDEBAR: CAMERA RECORDING & PROCTORING STATUS */}
          <ResizablePanel defaultSize={26} minSize={20} maxSize={35} className="bg-card/40 border-r border-border/70 p-4">
            <div className="h-full flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* PROCTORED CAMERA FEED CONTAINER */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                      <VideoIcon className="size-4" />
                      Candidate Video Feed
                    </div>
                    <Badge variant="outline" className="text-[10px] gap-1 bg-red-500/10 text-red-500 border-red-500/30">
                      <span className="size-1.5 rounded-full bg-red-500 animate-ping" />
                      REC
                    </Badge>
                  </div>

                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border/80 bg-black shadow-md">
                    <SpeakerLayout />
                  </div>
                </div>

                {/* SECURITY & PROCTORING STATUS CARD */}
                <Card className="border-border/70 bg-background/60 shadow-sm">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      <ShieldCheckIcon className="size-4 text-emerald-500" />
                      Proctoring Protocol
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Camera Feed:</span>
                      <span className="font-medium text-emerald-500">Mandatory & Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Audio Channel:</span>
                      <span className="font-medium text-emerald-500">Live Recording</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Recruiter Review:</span>
                      <span className="font-medium text-foreground">Session Saved</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ACTION FOOTER */}
              <div className="pt-3 border-t border-border/70">
                <Button
                  variant="outline"
                  className="w-full gap-2 text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => router.push("/")}
                >
                  <LogOutIcon className="size-3.5" />
                  Exit Assessment
                </Button>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* MAIN WORKSPACE: CODE EDITOR */}
          <ResizablePanel defaultSize={74} minSize={65}>
            <CodeEditor />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }

  // Interviewer / Two-Way Meeting Layout
  return (
    <div className="h-[calc(100vh-4rem-1px)]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={isInterviewer ? 48 : 35}
          minSize={30}
          maxSize={isInterviewer ? 70 : 100}
          className="relative"
        >
          {/* VIDEO LAYOUT */}
          <div className="absolute inset-0">
            {layout === "grid" ? <PaginatedGridLayout /> : <SpeakerLayout />}

            {/* PARTICIPANTS LIST OVERLAY */}
            {showParticipants && (
              <div className="absolute right-0 top-0 h-full w-[300px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CallParticipantsList onClose={() => setShowParticipants(false)} />
              </div>
            )}
          </div>

          {/* VIDEO CONTROLS */}

          <div className="absolute bottom-4 left-0 right-0">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 flex-wrap justify-center px-4">
                <CallControls onLeave={() => router.push("/")} />

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="size-10">
                        <LayoutListIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setLayout("grid")}>
                        Grid View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLayout("speaker")}>
                        Speaker View
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10"
                    onClick={() => setShowParticipants(!showParticipants)}
                  >
                    <UsersIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={isInterviewer ? 52 : 65} minSize={30}>
          <CodeEditor />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default MeetingRoom;
