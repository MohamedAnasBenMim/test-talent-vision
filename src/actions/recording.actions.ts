"use server";

import { currentUser } from "@clerk/nextjs/server";
import { StreamClient } from "@stream-io/node-sdk";

const STREAM_CALL_TYPE = "default";

async function assertSignedIn() {
  const user = await currentUser();
  if (!user) throw new Error("You must be signed in to perform this action");
}

function getStreamClient() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const secret = process.env.STREAM_SECRET_KEY;

  if (!apiKey || !secret) {
    throw new Error("Stream credentials are missing");
  }

  return new StreamClient(apiKey, secret);
}

export async function deleteStreamRecording({
  callId,
  sessionId,
  filename,
}: {
  callId: string;
  sessionId: string;
  filename: string;
}) {
  await assertSignedIn();

  if (!callId || !sessionId || !filename) {
    throw new Error("Recording delete information is missing");
  }

  const client = getStreamClient();
  const call = client.video.call(STREAM_CALL_TYPE, callId);
  await call.deleteRecording({ session: sessionId, filename });
}

export async function deleteStreamCall({ callId }: { callId: string }) {
  await assertSignedIn();

  if (!callId) {
    throw new Error("Call id is missing");
  }

  const client = getStreamClient();
  const call = client.video.call(STREAM_CALL_TYPE, callId);
  await call.delete({ hard: true });
}
