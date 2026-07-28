"use server";

import { api } from "../../convex/_generated/api";
import { currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { StreamClient } from "@stream-io/node-sdk";

const STREAM_CALL_TYPE = "default";

async function assertInterviewer() {
  const user = await currentUser();
  if (!user) throw new Error("You must be signed in");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is missing");

  const convex = new ConvexHttpClient(convexUrl);
  const appUser = await convex.query(api.users.getUserByClerkId, {
    clerkId: user.id,
  });

  if (appUser?.role !== "interviewer") {
    throw new Error("Only interviewers can delete recordings and calls");
  }
}

function getStreamCall(callId: string) {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const secret = process.env.STREAM_SECRET_KEY;

  if (!apiKey || !secret) {
    throw new Error("Stream credentials are missing");
  }

  const streamClient = new StreamClient(apiKey, secret);
  return streamClient.video.call(STREAM_CALL_TYPE, callId);
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
  await assertInterviewer();

  if (!callId || !sessionId || !filename) {
    throw new Error("Recording delete information is missing");
  }

  const call = getStreamCall(callId);
  await call.deleteRecording({ session: sessionId, filename });
}

export async function deleteStreamCall({ callId }: { callId: string }) {
  await assertInterviewer();

  if (!callId) {
    throw new Error("Call id is missing");
  }

  const call = getStreamCall(callId);
  await call.delete({ hard: true });
}
