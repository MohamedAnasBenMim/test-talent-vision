"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon, UserIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function RoleSwitcher() {
  const { user } = useUser();
  const { isCandidate, isInterviewer, isLoading } = useUserRole();
  const setRole = useMutation(api.users.setRole);
  const [isUpdating, setIsUpdating] = useState(false);

  if (isLoading || !user) return null;

  const handleSwitchRole = async (targetRole: "interviewer" | "candidate") => {
    try {
      setIsUpdating(true);
      await setRole({
        clerkId: user.id,
        role: targetRole,
      });
      toast.success(
        targetRole === "interviewer"
          ? "Switched to Recruiter Workspace"
          : "Switched to Candidate View"
      );
    } catch (err) {
      toast.error("Failed to switch role");
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isCandidate) {
    return (
      <Button
        variant="default"
        size="sm"
        disabled={isUpdating}
        onClick={() => handleSwitchRole("interviewer")}
        className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white font-semibold text-xs shadow-sm"
      >
        {isUpdating ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <ShieldCheckIcon className="size-3.5" />
        )}
        Switch to Recruiter Dashboard
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isUpdating}
      onClick={() => handleSwitchRole("candidate")}
      className="gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {isUpdating ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <UserIcon className="size-3.5" />
      )}
      Candidate View
    </Button>
  );
}
