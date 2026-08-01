import { useUser } from "@clerk/nextjs";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { sendInterviewInvite } from "@/actions/invite.actions";
import { api } from "../../../../convex/_generated/api";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UserInfo from "@/components/UserInfo";
import { Loader2Icon, XIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import MeetingCard from "@/components/MeetingCard";
import LoaderUI from "@/components/LoaderUI";

const HOURS_24 = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

function getTimeParts(time: string) {
  const [hour = "09", minute = "00"] = time.split(":");
  return { hour, minute };
}

function setTimePart(time: string, part: "hour" | "minute", value: string) {
  const { hour, minute } = getTimeParts(time);
  return part === "hour" ? `${value}:${minute}` : `${hour}:${value}`;
}

function InterviewScheduleUI() {
  const client = useStreamVideoClient();
  const { user } = useUser();
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const interviews = useQuery(
    api.interviews.getAllInterviews,
    isAuthenticated ? {} : "skip"
  ) ?? [];
  const users = useQuery(api.users.getUsers, isAuthenticated ? {} : "skip") ?? [];
  const createInterview = useMutation(api.interviews.createInterview);

  const candidates = users?.filter((u) => u.role === "candidate");
  const interviewers = users?.filter((u) => u.role === "interviewer");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: new Date(),
    time: "09:00",
    candidateId: "",
    interviewerIds: user?.id ? [user.id] : [],
  });

  useEffect(() => {
    if (!user?.id) return;

    setFormData((prev) =>
      prev.interviewerIds.includes(user.id)
        ? prev
        : { ...prev, interviewerIds: [user.id, ...prev.interviewerIds] }
    );
  }, [user?.id]);

  const scheduleMeeting = async () => {
    if (!client || !user) return;
    if (!formData.candidateId || formData.interviewerIds.length === 0) {
      toast.error("Please select both candidate and at least one interviewer");
      return;
    }

    setIsCreating(true);

    try {
      const { title, description, date, time, candidateId, interviewerIds } = formData;
      const candidate = candidates.find((item) => item.clerkId === candidateId);

      if (!candidate) {
        toast.error("Selected candidate was not found");
        return;
      }

      const [hours, minutes] = time.split(":").map(Number);

      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        toast.error("Please enter a valid time");
        return;
      }

      const meetingDate = new Date(date);
      meetingDate.setHours(hours, minutes, 0, 0);

      const id = crypto.randomUUID();
      const call = client.call("default", id);

      await call.getOrCreate({
        data: {
          starts_at: meetingDate.toISOString(),
          custom: {
            description: title,
            additionalDetails: description,
          },
        },
      });

      await createInterview({
        title,
        description,
        startTime: meetingDate.getTime(),
        status: "upcoming",
        streamCallId: id,
        candidateId,
        interviewerIds,
      });

      const meetingUrl = `${window.location.origin}/meeting/${id}`;

      try {
        await sendInterviewInvite({
          candidateEmail: candidate.email,
          candidateName: candidate.name,
          interviewTitle: title,
          interviewDescription: description,
          startTime: meetingDate.getTime(),
          meetingUrl,
        });
        toast.success("Meeting scheduled and invitation email sent!");
      } catch (emailError) {
        console.error(emailError);
        const errorMessage =
          emailError instanceof Error
            ? emailError.message
            : "Meeting scheduled, but invitation email was not sent.";
        toast.error(errorMessage);
      }

      setOpen(false);

      setFormData({
        title: "",
        description: "",
        date: new Date(),
        time: "09:00",
        candidateId: "",
        interviewerIds: user?.id ? [user.id] : [],
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to schedule meeting. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const addInterviewer = (interviewerId: string) => {
    if (!formData.interviewerIds.includes(interviewerId)) {
      setFormData((prev) => ({
        ...prev,
        interviewerIds: [...prev.interviewerIds, interviewerId],
      }));
    }
  };

  const removeInterviewer = (interviewerId: string) => {
    if (interviewerId === user?.id) return;
    setFormData((prev) => ({
      ...prev,
      interviewerIds: prev.interviewerIds.filter((id) => id !== interviewerId),
    }));
  };

  const selectedInterviewers = interviewers.filter((i) =>
    formData.interviewerIds.includes(i.clerkId)
  );

  const availableInterviewers = interviewers.filter(
    (i) => !formData.interviewerIds.includes(i.clerkId)
  );

  if (isConvexAuthLoading) return <LoaderUI />;
  if (!isAuthenticated) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <p className="text-muted-foreground">
          Your session is still connecting to Convex. Sign out, sign back in, then refresh this
          page.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-lg border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Talent Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Schedule Interviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create structured video evaluations for candidates and interview teams.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <Button size="lg" onClick={() => setOpen(true)}>
            Schedule Interview
          </Button>

          <DialogContent className="h-[calc(100vh-160px)] overflow-auto border-border/80 bg-card/95 sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Schedule Interview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* INTERVIEW TITLE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Interview title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* INTERVIEW DESC */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Interview description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* CANDIDATE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Candidate</label>
                <Select
                  value={formData.candidateId}
                  onValueChange={(candidateId) => setFormData({ ...formData, candidateId })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.clerkId} value={candidate.clerkId}>
                        <UserInfo user={candidate} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* INTERVIEWERS */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Interviewers</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedInterviewers.map((interviewer) => (
                    <div
                      key={interviewer.clerkId}
                      className="inline-flex items-center gap-2 bg-secondary px-2 py-1 rounded-md text-sm"
                    >
                      <UserInfo user={interviewer} />
                      {interviewer.clerkId !== user?.id && (
                        <button
                          onClick={() => removeInterviewer(interviewer.clerkId)}
                          className="hover:text-destructive transition-colors"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {availableInterviewers.length > 0 && (
                  <Select onValueChange={addInterviewer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add interviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInterviewers.map((interviewer) => (
                        <SelectItem key={interviewer.clerkId} value={interviewer.clerkId}>
                          <UserInfo user={interviewer} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* DATE & TIME */}
              <div className="flex gap-4">
                {/* CALENDAR */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData({ ...formData, date })}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>

                {/* TIME */}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Time</label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={getTimeParts(formData.time).hour}
                      onValueChange={(hour) =>
                        setFormData({
                          ...formData,
                          time: setTimePart(formData.time, "hour", hour),
                        })
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
                      value={getTimeParts(formData.time).minute}
                      onValueChange={(minute) =>
                        setFormData({
                          ...formData,
                          time: setTimePart(formData.time, "minute", minute),
                        })
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

              {/* ACTION BUTTONS */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={scheduleMeeting} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule Interview"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!interviews ? (
        <div className="flex justify-center py-12">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : interviews.length > 0 ? (
        <div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {interviews.map((interview) => (
              <MeetingCard key={interview._id} interview={interview} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No interviews scheduled</div>
      )}
    </div>
  );
}
export default InterviewScheduleUI;
