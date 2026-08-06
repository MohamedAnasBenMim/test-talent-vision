"use server";

import { api } from "../../convex/_generated/api";
import { currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

type SendApplicationRejectionArgs = {
  candidateEmail: string;
  candidateName: string;
  position: string;
};

type SendApplicationConfirmationArgs = {
  candidateEmail: string;
  candidateName: string;
  position: string;
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
    throw new Error("Only interviewers can send application emails");
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendApplicationRejectionEmail({
  candidateEmail,
  candidateName,
  position,
}: SendApplicationRejectionArgs) {
  await assertInterviewer();

  const resendApiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.INTERVIEW_INVITE_FROM ?? "BECARTHAI TalentVision <onboarding@resend.dev>";

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const safeName = escapeHtml(candidateName || "Candidate");
  const safePosition = escapeHtml(position);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: candidateEmail,
      subject: `Application update: ${position}`,
      html: `
        <div style="margin:0;padding:32px;background:#0b1118;font-family:Arial,sans-serif;color:#f8fafc;">
          <div style="max-width:620px;margin:0 auto;border:1px solid #273241;border-radius:10px;background:#101721;overflow:hidden;">
            <div style="height:4px;background:#c653f1;"></div>
            <div style="padding:28px;">
              <p style="margin:0 0 10px;color:#c653f1;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                BECARTH.AI Consulting
              </p>
              <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;color:#ffffff;">
                Application Update
              </h1>
              <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.6;">
                Hello ${safeName},
              </p>
              <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.6;">
                Thank you for applying to BECARTH.AI Consulting for
                <strong style="color:#ffffff;">${safePosition}</strong>.
              </p>
              <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.6;">
                After reviewing your application, we will not continue with your candidature.
                We appreciate your interest and wish you success.
              </p>
              <p style="margin:22px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
                BECARTH.AI Consulting Recruiting Team
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Hello ${candidateName || "Candidate"},

Thank you for applying to BECARTH.AI Consulting for ${position}.

After reviewing your application, we will not continue with your candidature.
We appreciate your interest and wish you success.

BECARTH.AI Consulting Recruiting Team`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send rejection email: ${errorText}`);
  }
}

export async function sendApplicationConfirmationEmail({
  candidateEmail,
  candidateName,
  position,
}: SendApplicationConfirmationArgs) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.INTERVIEW_INVITE_FROM ?? "BECARTHAI TalentVision <onboarding@resend.dev>";

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const safeName = escapeHtml(candidateName || "Candidate");
  const safePosition = escapeHtml(position);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: candidateEmail,
      subject: `Application received: ${position}`,
      html: `
        <div style="margin:0;padding:32px;background:#0b1118;font-family:Arial,sans-serif;color:#f8fafc;">
          <div style="max-width:620px;margin:0 auto;border:1px solid #273241;border-radius:10px;background:#101721;overflow:hidden;">
            <div style="height:4px;background:#c653f1;"></div>
            <div style="padding:28px;">
              <p style="margin:0 0 10px;color:#c653f1;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                BECARTH.AI Consulting
              </p>
              <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;color:#ffffff;">
                Application Received
              </h1>
              <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.6;">
                Hello ${safeName},
              </p>
              <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.6;">
                Thank you for your interest in
                <strong style="color:#ffffff;">${safePosition}</strong> at BECARTH.AI Consulting.
              </p>
              <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.6;">
                We have received your application and our recruiting team will review your profile.
                We will keep you updated by email about the next steps.
              </p>
              <p style="margin:22px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
                BECARTH.AI Consulting Recruiting Team
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Hello ${candidateName || "Candidate"},

Thank you for your interest in ${position} at BECARTH.AI Consulting.

We have received your application and our recruiting team will review your profile.
We will keep you updated by email about the next steps.

BECARTH.AI Consulting Recruiting Team`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send confirmation email: ${errorText}`);
  }
}
