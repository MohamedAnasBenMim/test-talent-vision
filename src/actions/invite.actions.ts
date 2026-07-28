"use server";

import { api } from "../../convex/_generated/api";
import { currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

type SendInterviewInviteArgs = {
  candidateEmail: string;
  candidateName: string;
  interviewTitle: string;
  interviewDescription?: string;
  startTime: number;
  meetingUrl: string;
};

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
    throw new Error("Only interviewers can send interview invitations");
  }
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

export async function sendInterviewInvite({
  candidateEmail,
  candidateName,
  interviewTitle,
  interviewDescription,
  startTime,
  meetingUrl,
}: SendInterviewInviteArgs) {
  await assertInterviewer();

  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.INTERVIEW_INVITE_FROM ?? "BECARTHAI TalentVision <onboarding@resend.dev>";

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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: candidateEmail,
      subject: `Technical interview invitation: ${interviewTitle}`,
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
                Hello ${safeName}, you have been invited to a technical interview for
                <strong style="color:#ffffff;">${safeTitle}</strong>.
              </p>
              ${descriptionHtml}
              <div style="margin:22px 0;padding:16px;border:1px solid #273241;border-radius:8px;background:#0b1118;">
                <p style="margin:0;color:#94a3b8;font-size:13px;">Scheduled date</p>
                <p style="margin:6px 0 0;color:#ffffff;font-size:17px;font-weight:700;">${scheduledTime}</p>
              </div>
              <a href="${meetingUrl}" style="display:inline-block;margin:8px 0 18px;padding:13px 18px;border-radius:7px;background:#c653f1;color:#0b1118;font-weight:700;text-decoration:none;">
                Open Interview Link
              </a>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                The interview page will show a waiting screen before the scheduled time. When the time arrives,
                the Enter Interview button will become available.
              </p>
              <p style="margin:18px 0 0;color:#64748b;font-size:12px;word-break:break-all;">
                ${meetingUrl}
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Hello ${safeName},

You have been invited to a technical interview for ${interviewTitle}.

Scheduled date: ${scheduledTime}

Open your interview link:
${meetingUrl}

The page will show a waiting screen before the scheduled time. When the time arrives, the Enter Interview button will become available.`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send invitation email: ${errorText}`);
  }
}
