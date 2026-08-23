import { useEffect, useState } from "react";
import { Call, useStreamVideoClient } from "@stream-io/video-react-sdk";

const useGetCallById = (id: string | string[]) => {
  const [call, setCall] = useState<Call>();
  const [isCallLoading, setIsCallLoading] = useState(true);

  const client = useStreamVideoClient();

  useEffect(() => {
    if (!client || !id) {
      return;
    }

    const callId = Array.isArray(id) ? id[0] : id;
    let isMounted = true;

    const getCall = async () => {
      try {
        const callInstance = client.call("default", callId);
        await callInstance.getOrCreate();

        if (isMounted) {
          setCall(callInstance);
        }
      } catch (error) {
        console.error("Error fetching Stream call:", error);
        if (isMounted) setCall(undefined);
      } finally {
        if (isMounted) setIsCallLoading(false);
      }
    };

    getCall();

    return () => {
      isMounted = false;
    };
  }, [client, id]);

  return { call, isCallLoading };
};

export default useGetCallById;
