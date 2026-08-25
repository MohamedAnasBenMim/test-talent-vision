"use client";

import { FormEvent, useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FINAL_HR_RECOMMENDATION_LABELS,
  FinalHrRecommendation,
  getFinalHrRecommendationVariant,
} from "@/components/applications/status";
import {
  BriefcaseIcon,
  CalendarIcon,
  ChevronRightIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  SendIcon,
  UserCheckIcon,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createStreamInterviewCall } from "@/actions/stream.actions";
import { sendInterviewInvite } from "@/actions/invite.actions";

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function getTimeParts(timeString: string) {
  const [h, m] = timeString.split(":");
  return { hour: h || "09", minute: m || "00" };
}

function setTimePart(timeString: string, part: "hour" | "minute", value: string) {
  const current = getTimeParts(timeString);
  const nextHour = part === "hour" ? value : current.hour;
  const nextMinute = part === "minute" ? value : current.minute;
  return `${nextHour}:${nextMinute}`;
}

export default function ShortlistedCandidates() {
  const { user } = useUser();
  const applications = useQuery(api.applications.getApplications);
  const createInterview = useMutation(api.interviews.createInterview);
  const updateApplicationStatus = useMutation(api.applications.updateCandidateStatus);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    description: "",
    date: new Date(),
    time: "09:00",
  });

  const preSelectedApps = useMemo(() => {
    if (!applications) return [];
    return applications.filter((app) => {
      const isPreselected =
        app.status === "hr_shortlisted" ||
        app.finalRecommendation === "strong_recommend_hr" ||
        app.finalRecommendation === "recommend_hr";

      if (!isPreselected) return false;

      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      return (
        app.fullName.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query) ||
        app.position.toLowerCase().includes(query)
      );
    });
  }, [applications, searchTerm]);

  const openScheduleModal = (candidate: any) => {
    setSelectedCandidate(candidate);
    setScheduleForm({
      title: `Executive HR Interview - ${candidate.position}`,
      description: `Executive HR Interview round for position of ${candidate.position}.`,
      date: new Date(),
      time: "09:00",
    });
    setIsScheduleOpen(true);
  };

  const handleScheduleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCandidate || !user) return;

    setIsScheduling(true);

    try {
      const [hours, minutes] = scheduleForm.time.split(":").map(Number);

      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        toast.error("Please choose a valid time");
        return;
      }

      const meetingDate = new Date(scheduleForm.date);
      meetingDate.setHours(hours, minutes, 0, 0);

      const streamCallId = crypto.randomUUID();

      await createStreamInterviewCall({
        callId: streamCallId,
        title: scheduleForm.title,
        description: scheduleForm.description,
        startsAt: meetingDate.toISOString(),
      });

      await createInterview({
        title: scheduleForm.title,
        description: scheduleForm.description,
        startTime: meetingDate.getTime(),
        status: "upcoming",
        streamCallId,
        candidateId: selectedCandidate.email,
        applicationId: selectedCandidate._id,
        candidateName: selectedCandidate.fullName,
        candidateEmail: selectedCandidate.email,
        interviewerIds: [user.id],
      });

      const meetingUrl = `${window.location.origin}/meeting/${streamCallId}`;

      await sendInterviewInvite({
        candidateEmail: selectedCandidate.email,
        candidateName: selectedCandidate.fullName,
        interviewTitle: scheduleForm.title,
        interviewDescription: scheduleForm.description,
        startTime: meetingDate.getTime(),
        meetingUrl,
      });

      await updateApplicationStatus({
        id: selectedCandidate._id,
        status: "hr_shortlisted",
      });

      toast.success(`HR Interview scheduled & invitation sent to ${selectedCandidate.fullName}`);
      setIsScheduleOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to schedule HR interview");
    } finally {
      setIsScheduling(false);
    }
  };

  if (applications === undefined) return <LoaderUI />;

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-500">
          <UserCheckIcon className="size-4" /> Pre-Selected HR Pipeline
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          Candidates Eligible for HR Interview 🎯
        </h1>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Filter pre-selected candidates by name, email, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      {/* Candidates Grid */}
      {preSelectedApps.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground space-y-3">
            <UserCheckIcon className="mx-auto size-12 opacity-40 text-emerald-500" />
            <p className="text-lg font-bold text-foreground">No Pre-Selected Candidates Yet</p>
            <p className="text-sm max-w-md mx-auto">
              After AI sorts candidates based on CV and technical assessment scores, click <strong>"Pre-select for HR Interview"</strong> on their profile to invite them!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {preSelectedApps.map((app) => (
            <Card key={app._id} className="overflow-hidden border border-emerald-500/30 hover:border-emerald-500/60 transition-all shadow-md">
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-primary" />
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{app.fullName}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <BriefcaseIcon className="size-3.5 text-primary" /> {app.position}
                    </p>
                  </div>
                  {app.finalRecommendation && (
                    <Badge variant={getFinalHrRecommendationVariant(app.finalRecommendation as FinalHrRecommendation)}>
                      {FINAL_HR_RECOMMENDATION_LABELS[app.finalRecommendation as FinalHrRecommendation]}
                    </Badge>
                  )}
                </div>

                {/* Score Pills */}
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2.5 text-center text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">CV Match</p>
                    <p className="text-sm font-bold text-foreground">{app.cvScore ?? app.aiScore ?? "--"}</p>
                  </div>
                  <div className="border-x border-border/40">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tech Test</p>
                    <p className="text-sm font-bold text-primary">{app.technicalScore ?? "Not Taken"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-primary uppercase font-bold">Final AI</p>
                    <p className="text-sm font-black text-primary">{app.finalScore ?? "--"}</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 truncate">
                    <MailIcon className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{app.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="size-3.5 text-primary shrink-0" />
                    <span>{app.phone}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col gap-2 border-t border-border/50">
                  <Button
                    onClick={() => openScheduleModal(app)}
                    size="sm"
                    className="w-full text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <CalendarIcon className="size-3.5" />
                    Invite to HR Interview
                  </Button>

                  <Button asChild variant="outline" size="sm" className="w-full text-xs h-8 gap-1">
                    <Link href={`/dashboard/applications/${app._id}`}>
                      View Full Candidate Profile <ChevronRightIcon className="size-3.5 ml-auto" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule HR Interview Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule HR Interview</DialogTitle>
            <DialogDescription>
              Schedule an executive HR video interview and send candidate their invitation link.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleScheduleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="hrInterviewTitle">Title</Label>
              <Input
                id="hrInterviewTitle"
                required
                value={scheduleForm.title}
                onChange={(event) =>
                  setScheduleForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hrInterviewDescription">Description</Label>
              <Textarea
                id="hrInterviewDescription"
                rows={3}
                value={scheduleForm.description}
                onChange={(event) =>
                  setScheduleForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            {selectedCandidate && (
              <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 space-y-1 text-xs">
                <p className="font-semibold text-foreground">Candidate</p>
                <p className="text-muted-foreground">{selectedCandidate.fullName} ({selectedCandidate.email})</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label>Date</Label>
                <Calendar
                  mode="single"
                  selected={scheduleForm.date}
                  onSelect={(date) => date && setScheduleForm((prev) => ({ ...prev, date }))}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={getTimeParts(scheduleForm.time).hour}
                    onValueChange={(hour) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        time: setTimePart(prev.time, "hour", hour),
                      }))
                    }
                  >
                    <SelectTrigger className="w-[76px]">
                      <SelectValue placeholder="HH" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      {HOURS_24.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-lg font-semibold text-muted-foreground">:</span>
                  <Select
                    value={getTimeParts(scheduleForm.time).minute}
                    onValueChange={(minute) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        time: setTimePart(prev.time, "minute", minute),
                      }))
                    }
                  >
                    <SelectTrigger className="w-[76px]">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      {MINUTES.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isScheduling} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isScheduling ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
                Schedule HR Interview
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
