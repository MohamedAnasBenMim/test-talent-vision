"use server";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { StreamClient } from "@stream-io/node-sdk";

const AUTO_TECHNICAL_INVITE_EMAIL = "medanasbenmim123@gmail.com";
const AUTO_INVITE_STREAM_USER_ID = "becarthai-auto-invite";
const DEFAULT_AUTO_INTERVIEW_DELAY_MINUTES = 5;

type AutoSendTechnicalInterviewInviteArgs = {
  applicationId: string;
  appOrigin: string;
};

function getAutoInterviewDelayMinutes() {
  const value = Number(process.env.AUTO_INTERVIEW_DELAY_MINUTES);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_AUTO_INTERVIEW_DELAY_MINUTES;
}

function formatInterviewDate(startTime: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Tunis",
  }).format(new Date(startTime));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendAutoInterviewInviteEmail({
  candidateEmail,
  candidateName,
  interviewTitle,
  interviewDescription,
  startTime,
  meetingUrl,
}: {
  candidateEmail: string;
  candidateName: string;
  interviewTitle: string;
  interviewDescription?: string;
  startTime: number;
  meetingUrl: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.INTERVIEW_INVITE_FROM ?? "BECARTHAI TalentVision <onboarding@resend.dev>";

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const scheduledTime = formatInterviewDate(startTime);
  const safeName = escapeHtml(candidateName || "Candidate");
  const safeTitle = escapeHtml(interviewTitle);
  const safeDescription = interviewDescription ? escapeHtml(interviewDescription) : "";
  const descriptionHtml = interviewDescription
    ? `<p style="margin:0 0 18px;color:#94a3b8;line-height:1.6;">${safeDescription}</p>`
    : "";
  const subject = `Technical interview invitation: ${interviewTitle}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: candidateEmail,
      subject,
      html: `
        <div style="margin:0;padding:32px;background:#0b1118;font-family:Arial,sans-serif;color:#f8fafc;">
          <div style="max-width:620px;margin:0 auto;border:1px solid #273241;border-radius:10px;background:#101721;overflow:hidden;">
            <div style="height:4px;background:#c653f1;"></div>
            <div style="padding:28px;">
              <p style="margin:0 0 10px;color:#c653f1;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                BECARTH.AI Consulting
              </p>
              <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;color:#ffffff;">
                Technical Interview Invitation
              </h1>
              <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.6;">
                Hello ${safeName}, your application matched the automatic technical interview flow for
                <strong style="color:#ffffff;">${safeTitle}</strong>.
              </p>
              ${descriptionHtml}
              <div style="margin:22px 0;padding:16px;border:1px solid #273241;border-radius:8px;background:#0b1118;">
                <p style="margin:0;color:#94a3b8;font-size:13px;">Scheduled date</p>
                <p style="margin:6px 0 0;color:#ffffff;font-size:17px;font-weight:700;">${scheduledTime}</p>
              </div>
              <a href="${meetingUrl}" style="display:inline-block;margin:8px 0 18px;padding:13px 18px;border-radius:7px;background:#c653f1;color:#0b1118;font-weight:700;text-decoration:none;">
                Open Technical Interview
              </a>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                The interview link opens a QCM assessment gate before the interview room.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Hello ${candidateName || "Candidate"},

Your application matched the automatic technical interview flow for ${interviewTitle}.

Scheduled date: ${scheduledTime}

The interview link opens a QCM assessment gate before the interview room.

BECARTH.AI Consulting Recruiting Team`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send automatic interview invite: ${errorText}`);
  }
}

export async function autoSendTechnicalInterviewInvite({
  applicationId,
  appOrigin,
}: AutoSendTechnicalInterviewInviteArgs) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const streamApiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const streamSecretKey = process.env.STREAM_SECRET_KEY;

  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is missing");
  if (!streamApiKey) throw new Error("NEXT_PUBLIC_STREAM_API_KEY is missing");
  if (!streamSecretKey) throw new Error("STREAM_SECRET_KEY is missing");

  const startTime = Date.now() + getAutoInterviewDelayMinutes() * 60 * 1000;
  const streamCallId = crypto.randomUUID();
  const title = "Automatic Technical Interview";
  const description =
    "Automatic technical interview invitation with a QCM assessment gate before the interview room.";

  const streamClient = new StreamClient(streamApiKey, streamSecretKey);
  await streamClient.upsertUsers([
    {
      id: AUTO_INVITE_STREAM_USER_ID,
      name: "BECARTHAI TalentVision",
    },
  ]);

  const call = streamClient.video.call("default", streamCallId);

  await call.getOrCreate({
    data: {
      starts_at: new Date(startTime),
      created_by_id: AUTO_INVITE_STREAM_USER_ID,
      custom: {
        description: title,
        additionalDetails: description,
      },
    },
  });

  const convex = new ConvexHttpClient(convexUrl);
  const interview = await convex.mutation(api.applications.createAutoInterviewForTargetApplication, {
    id: applicationId as Id<"applications">,
    streamCallId,
    title,
    description,
    startTime,
  });

  if (!interview) {
    return { sent: false as const };
  }

  if (interview.candidateEmail.trim().toLowerCase() !== AUTO_TECHNICAL_INVITE_EMAIL) {
    return { sent: false as const };
  }

  const meetingUrl = `${appOrigin}/meeting/${interview.streamCallId}`;

  await sendAutoInterviewInviteEmail({
    candidateEmail: interview.candidateEmail,
    candidateName: interview.candidateName,
    interviewTitle: interview.title,
    interviewDescription: interview.description,
    startTime: interview.startTime,
    meetingUrl,
  });

  return {
    sent: true as const,
    meetingUrl,
  };
}
