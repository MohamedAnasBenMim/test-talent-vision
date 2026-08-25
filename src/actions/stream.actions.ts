"use server";

import { currentUser } from "@clerk/nextjs/server";
import { StreamClient } from "@stream-io/node-sdk";

type CreateStreamInterviewCallArgs = {
  callId: string;
  title: string;
  description?: string;
  startsAt: string;
};

function getStreamClient() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const secret = process.env.STREAM_SECRET_KEY;

  if (!apiKey) throw new Error("NEXT_PUBLIC_STREAM_API_KEY is missing");
  if (!secret) throw new Error("STREAM_SECRET_KEY is missing");

  return new StreamClient(apiKey, secret);
}

export const streamTokenProvider = async () => {
  const user = await currentUser();
  if (!user) throw new Error("User not authenticated");

  const streamClient = getStreamClient();
  return streamClient.generateUserToken({ user_id: user.id });
};

export const streamGuestTokenProvider = async (guestId: string) => {
  if (!guestId) throw new Error("Guest ID is missing");
  const streamClient = getStreamClient();
  return streamClient.generateUserToken({ user_id: guestId });
};

export async function createStreamInterviewCall({
  callId,
  title,
  description,
  startsAt,
}: CreateStreamInterviewCallArgs) {
  const user = await currentUser();
  if (!user) throw new Error("User not authenticated");

  const streamClient = getStreamClient();
  await streamClient.upsertUsers([
    {
      id: user.id,
      name: user.fullName || user.firstName || user.id,
      image: user.imageUrl,
    },
  ]);

  const call = streamClient.video.call("default", callId);

  await call.getOrCreate({
    data: {
      starts_at: new Date(startsAt),
      created_by_id: user.id,
      custom: {
        description: title,
        additionalDetails: description ?? "",
      },
    },
  });
}
