import { DeviceSettings, useCall, useCallStateHooks, VideoPreview } from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "./ui/card";
import {
  AlertTriangleIcon,
  CameraIcon,
  CheckCircle2Icon,
  MicIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Volume2Icon,
  XCircleIcon,
} from "lucide-react";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import toast from "react-hot-toast";

function MeetingSetup({ onSetupComplete }: { onSetupComplete: () => void }) {
  const [isCameraDisabled, setIsCameraDisabled] = useState(false);
  const [isMicDisabled, setIsMicDisabled] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isHardwareCameraWorking, setIsHardwareCameraWorking] = useState<boolean>(true);
  const [isHardwareMicWorking, setIsHardwareMicWorking] = useState<boolean>(true);

  const call = useCall();
  const { useCameraState, useMicrophoneState } = useCallStateHooks();
  const cameraState = useCameraState();
  const micState = useMicrophoneState();
  const hasCameraPermission = cameraState.hasBrowserPermission;
  const hasMicPermission = micState.hasBrowserPermission;

  if (!call) return null;

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await call.camera.enable();
      await call.microphone.enable();
      setIsCameraDisabled(false);
      setIsMicDisabled(false);
      toast.success("Camera & Microphone authorization granted!");
    } catch (error) {
      console.error("Permission request failed:", error);
      toast.error("Camera & Microphone authorization was blocked. Please enable permissions in your browser settings.");
    }
  };

  useEffect(() => {
    if (isCameraDisabled) {
      call.camera.disable();
      toast.error("Camera is required during the technical interview. Please keep your camera enabled.");
      return;
    }

    call.camera.enable().catch((error) => {
      console.error("Camera permission was not granted:", error);
      setIsCameraDisabled(true);
    });
  }, [isCameraDisabled, call.camera]);

  useEffect(() => {
    if (isMicDisabled) {
      call.microphone.disable();
      return;
    }

    call.microphone.enable().catch((error) => {
      console.error("Microphone permission was not granted:", error);
      setIsMicDisabled(true);
    });
  }, [isMicDisabled, call.microphone]);

  // Hardware kill-switch monitor (e.g. Fn+F6 / hardware webcam shutter / PC mute button)
  useEffect(() => {
    if (isCameraDisabled || hasCameraPermission === false) {
      setIsHardwareCameraWorking(false);
      return;
    }

    const checkCameraHardware = () => {
      const stream = cameraState.mediaStream;
      const track = stream?.getVideoTracks()[0];
      if (!track) {
        setIsHardwareCameraWorking(false);
        return;
      }
      // If Fn+F6 or hardware shutter mutes track at OS/hardware level
      const isLiveAndUnmuted = track.readyState === "live" && track.enabled && !track.muted;
      setIsHardwareCameraWorking(isLiveAndUnmuted);
    };

    checkCameraHardware();
    const interval = setInterval(checkCameraHardware, 800);

    const track = cameraState.mediaStream?.getVideoTracks()[0];
    if (track) {
      const handleMute = () => setIsHardwareCameraWorking(false);
      const handleUnmute = () => setIsHardwareCameraWorking(true);
      track.addEventListener("mute", handleMute);
      track.addEventListener("unmute", handleUnmute);
      return () => {
        clearInterval(interval);
        track.removeEventListener("mute", handleMute);
        track.removeEventListener("unmute", handleUnmute);
      };
    }

    return () => clearInterval(interval);
  }, [cameraState.mediaStream, isCameraDisabled, hasCameraPermission]);

  // Hardware microphone monitor
  useEffect(() => {
    if (isMicDisabled || hasMicPermission === false) {
      setIsHardwareMicWorking(false);
      return;
    }

    const checkMicHardware = () => {
      const stream = micState.mediaStream;
      const track = stream?.getAudioTracks()[0];
      if (!track) {
        setIsHardwareMicWorking(false);
        return;
      }
      const isLiveAndUnmuted = track.readyState === "live" && track.enabled && !track.muted;
      setIsHardwareMicWorking(isLiveAndUnmuted);
    };

    checkMicHardware();
    const interval = setInterval(checkMicHardware, 800);

    const track = micState.mediaStream?.getAudioTracks()[0];
    if (track) {
      const handleMute = () => setIsHardwareMicWorking(false);
      const handleUnmute = () => setIsHardwareMicWorking(true);
      track.addEventListener("mute", handleMute);
      track.addEventListener("unmute", handleUnmute);
      return () => {
        clearInterval(interval);
        track.removeEventListener("mute", handleMute);
        track.removeEventListener("unmute", handleUnmute);
      };
    }

    return () => clearInterval(interval);
  }, [micState.mediaStream, isMicDisabled, hasMicPermission]);

  // Real-time microphone audio visualizer
  useEffect(() => {
    if (isMicDisabled || hasMicPermission === false || !isHardwareMicWorking) {
      setAudioLevel(0);
      return;
    }

    let audioContext: AudioContext | null = null;
    let mediaStream: MediaStream | null = null;
    let animationFrameId: number;

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        mediaStream = stream;
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContext = new AudioCtx();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
          animationFrameId = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      })
      .catch(() => {
        setAudioLevel(0);
      });

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
      if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
    };
  }, [isMicDisabled, hasMicPermission, isHardwareMicWorking]);

  const handleJoin = async () => {
    await call.join();
    onSetupComplete();
  };

  // Triple-layer verification check (Browser Permission + Dashboard Switch + Hardware Track Live/Unmuted)
  const isCameraVerified = hasCameraPermission === true && !isCameraDisabled && isHardwareCameraWorking;
  const isMicVerified = hasMicPermission === true && !isMicDisabled && isHardwareMicWorking;
  const isSystemReady = isCameraVerified && isMicVerified;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background/95">
      <div className="w-full max-w-[1200px] mx-auto space-y-6">
        {/* REASSURING WELCOME BANNER (BIG FONT) */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-6 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <SparklesIcon className="size-7 text-purple-500 animate-pulse" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-purple-700 dark:text-purple-300 tracking-tight">
              Do not worry, our team is super friendly! We want you to succeed. 🎉
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Pre-Interview Hardware & Equipment Verification
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* CAMERA PREVIEW & STATUS */}
          <Card className="md:col-span-7 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CameraIcon className="size-5 text-primary" />
                  <h3 className="text-lg font-bold">Camera Feed Check</h3>
                </div>
                <Badge variant={hasCameraPermission === false ? "destructive" : !isCameraDisabled ? "default" : "secondary"}>
                  {hasCameraPermission === false ? "Authorization Blocked" : !isCameraDisabled ? "Camera Active" : "Camera Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Verify your lighting, position, and video stream before joining.
              </p>
            </div>

            {/* VIDEO PREVIEW */}
            <div className="mt-4 min-h-[360px] rounded-lg overflow-hidden bg-slate-950 border border-border/80 relative flex items-center justify-center">
              <div className="absolute inset-0">
                <VideoPreview className="h-full w-full object-cover" />
              </div>
              <div className="absolute top-3 left-3 z-10">
                <Badge variant="outline" className="bg-background/80 backdrop-blur text-xs gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Preview
                </Badge>
              </div>
            </div>
          </Card>

          {/* HARDWARE CHECK & MIC TEST */}
          <Card className="md:col-span-5 p-6 flex flex-col justify-between space-y-6">
            <div>
              <CardHeader className="p-0 mb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheckIcon className="size-5 text-primary" />
                  System Readiness Check
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Confirm your microphone and camera settings are authorized and working properly.
                </p>
              </CardHeader>

              <div className="space-y-4">
                {/* BROWSER AUTHORIZATION ERROR ALERT */}
                {(hasCameraPermission === false || hasMicPermission === false) && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-destructive">
                      <AlertTriangleIcon className="size-4 shrink-0" />
                      <span>Browser Authorization Required</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      Camera or microphone access is currently blocked by your browser. Please allow permissions in your address bar and click request below.
                    </p>
                    <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 mt-1" onClick={requestPermissions}>
                      <ShieldCheckIcon className="size-3.5 text-primary" />
                      Re-request Permissions
                    </Button>
                  </div>
                )}

                {/* CAM TOGGLE */}
                <div className="rounded-lg border border-border/70 bg-background/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <CameraIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Camera</p>
                        <p className="text-xs text-muted-foreground">
                          {hasCameraPermission === false
                            ? "Permission Blocked"
                            : !isCameraDisabled
                            ? isHardwareCameraWorking
                              ? "Authorized & Hardware Active"
                              : "Hardware Disabled (check Fn+F6 / privacy shutter)"
                            : "Disabled"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={!isCameraDisabled && hasCameraPermission !== false}
                      disabled={hasCameraPermission === false}
                      onCheckedChange={(checked) => setIsCameraDisabled(!checked)}
                    />
                  </div>
                </div>

                {/* MIC TOGGLE & LIVE AUDIO METER */}
                <div className="rounded-lg border border-border/70 bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <MicIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Microphone</p>
                        <p className="text-xs text-muted-foreground">
                          {hasMicPermission === false
                            ? "Permission Blocked"
                            : !isMicDisabled
                            ? isHardwareMicWorking
                              ? "Authorized & Hardware Active"
                              : "Hardware Muted (check PC mic key)"
                            : "Muted"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={!isMicDisabled && hasMicPermission !== false}
                      disabled={hasMicPermission === false}
                      onCheckedChange={(checked) => setIsMicDisabled(!checked)}
                    />
                  </div>

                  {/* LIVE AUDIO LEVEL METER */}
                  {!isMicDisabled && hasMicPermission !== false && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Volume2Icon className="size-3 text-primary" /> Audio Input Level
                        </span>
                        <span className="font-mono text-primary font-medium">{audioLevel}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-75 ease-out rounded-full"
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* DEVICE SELECTOR */}
                <div className="rounded-lg border border-border/70 bg-background/50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <SettingsIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Audio / Video Devices</p>
                      <p className="text-xs text-muted-foreground">Select input sources</p>
                    </div>
                  </div>
                  <DeviceSettings />
                </div>

                {/* READINESS CHECKLIST SUMMARY */}
                <div className="rounded-lg border border-border/70 bg-background/50 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-2">
                      {isCameraVerified ? (
                        <CheckCircle2Icon className="size-4 text-emerald-500" />
                      ) : (
                        <XCircleIcon className="size-4 text-destructive" />
                      )}
                      Camera Authorization & Feed
                    </span>
                    <Badge variant={isCameraVerified ? "default" : "destructive"}>
                      {isCameraVerified ? "Verified" : "Action Needed"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-2">
                      {isMicVerified ? (
                        <CheckCircle2Icon className="size-4 text-emerald-500" />
                      ) : (
                        <XCircleIcon className="size-4 text-destructive" />
                      )}
                      Microphone Authorization & Audio
                    </span>
                    <Badge variant={isMicVerified ? "default" : "destructive"}>
                      {isMicVerified ? "Verified" : "Action Needed"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* JOIN BUTTON */}
            <Button
              className="w-full gap-2 mt-4"
              size="lg"
              onClick={handleJoin}
              disabled={!isSystemReady}
            >
              <CheckCircle2Icon className="size-5" />
              {isSystemReady ? "All Systems Ready — Join Interview" : "Authorization Required to Join"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default MeetingSetup;
