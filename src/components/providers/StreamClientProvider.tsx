"use client";

import { ReactNode, useEffect, useState } from "react";
import { StreamVideoClient, StreamVideo } from "@stream-io/video-react-sdk";
import { useUser } from "@clerk/nextjs";
import LoaderUI from "../LoaderUI";
import { streamTokenProvider, streamGuestTokenProvider } from "@/actions/stream.actions";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

const StreamVideoProvider = ({ children }: { children: ReactNode }) => {
  const [streamVideoClient, setStreamVideoClient] = useState<StreamVideoClient | null>(null);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    let client: StreamVideoClient;

    if (user) {
      client = new StreamVideoClient({
        apiKey,
        user: {
          id: user.id,
          name: user.fullName || user.firstName || user.id,
          image: user.imageUrl,
        },
        tokenProvider: streamTokenProvider,
      });
    } else {
      let guestId = typeof window !== "undefined" ? sessionStorage.getItem("talentvision_guest_id") : null;
      if (!guestId) {
        guestId = "guest-" + Math.random().toString(36).substring(2, 10);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("talentvision_guest_id", guestId);
        }
      }

      client = new StreamVideoClient({
        apiKey,
        user: {
          id: guestId,
          name: "Candidate Guest",
        },
        tokenProvider: () => streamGuestTokenProvider(guestId!),
      });
    }

    setStreamVideoClient(client);

    return () => {
      client.disconnectUser();
    };
  }, [user, isLoaded]);

  if (!isLoaded || !streamVideoClient) return <LoaderUI />;

  return <StreamVideo client={streamVideoClient}>{children}</StreamVideo>;
};

export default StreamVideoProvider;

