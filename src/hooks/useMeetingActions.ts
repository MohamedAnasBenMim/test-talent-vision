import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createStreamInterviewCall } from "@/actions/stream.actions";

const useMeetingActions = () => {
  const router = useRouter();

  const createInstantMeeting = async () => {
    try {
      const id = crypto.randomUUID();

      await createStreamInterviewCall({
        callId: id,
        title: "Instant Meeting",
        startsAt: new Date().toISOString(),
      });

      router.push(`/meeting/${id}`);
      toast.success("Meeting Created");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create meeting");
    }
  };

  const joinMeeting = (callId: string) => {
    router.push(`/meeting/${callId}`);
  };

  return { createInstantMeeting, joinMeeting };
};

export default useMeetingActions;
