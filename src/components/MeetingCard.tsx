import useMeetingActions from "@/hooks/useMeetingActions";
import { Doc } from "../../convex/_generated/dataModel";
import { getMeetingStatus } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CalendarIcon, ClockIcon, VideoIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

type Interview = Doc<"interviews">;

function formatStartsIn(startTime: number, now: number) {
  const remainingMs = Math.max(0, startTime - now);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function MeetingCard({ interview }: { interview: Interview }) {
  const { joinMeeting } = useMeetingActions();
  const [now, setNow] = useState(Date.now());

  const status = getMeetingStatus(interview, new Date(now));
  const formattedDate = format(new Date(interview.startTime), "EEEE, MMMM d · h:mm a");
  const startsIn = formatStartsIn(interview.startTime, now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <Card className="overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-fuchsia-400" />
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            {formattedDate}
          </div>

          <Badge
            variant={
              status === "live" ? "default" : status === "upcoming" ? "secondary" : "outline"
            }
          >
            {status === "live" ? "Live Now" : status === "upcoming" ? "Upcoming" : "Completed"}
          </Badge>
        </div>

        <CardTitle className="text-lg tracking-tight">{interview.title}</CardTitle>

        {interview.description && (
          <CardDescription className="line-clamp-2">{interview.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        {status === "live" && (
          <Button className="w-full gap-2" onClick={() => joinMeeting(interview.streamCallId)}>
            <VideoIcon className="size-4" />
            Enter Meeting
          </Button>
        )}

        {status === "upcoming" && (
          <Button variant="outline" className="w-full gap-2" disabled>
            <ClockIcon className="size-4" />
            Opens in {startsIn}
          </Button>
        )}

        {status === "completed" && (
          <Button variant="outline" className="w-full" disabled>
            Interview Completed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
export default MeetingCard;
