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
      subject: `Thank you for applying to BECARTH.AI Consulting`,
      html: `
        <div style="margin:0;padding:36px 18px;background:#08111f;font-family:Arial,Helvetica,sans-serif;color:#f8fafc;">
          <div style="max-width:640px;margin:0 auto;border:1px solid #243041;border-radius:12px;background:#101722;overflow:hidden;box-shadow:0 18px 42px rgba(0,0,0,0.28);">
            <div style="height:5px;background:linear-gradient(90deg,#c653f1,#27d3a2,#38bdf8);"></div>
            <div style="padding:30px;">
              <div style="margin:0 0 24px;">
                <p style="margin:0;color:#c653f1;font-size:12px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;">
                  BECARTH.AI Consulting
                </p>
              </div>

              <h1 style="margin:0 0 16px;font-size:28px;line-height:1.22;color:#ffffff;">
                Thank you for your application
              </h1>

              <p style="margin:0 0 18px;color:#dbeafe;line-height:1.7;font-size:15px;">
                Hello ${safeName},
              </p>
              <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.7;font-size:15px;">
                We have received your application for
                <strong style="color:#ffffff;">${safePosition}</strong>. Thank you for taking the
                time to share your profile with BECARTH.AI Consulting.
              </p>

              <div style="margin:24px 0;padding:18px;border:1px solid #2f3d52;border-radius:10px;background:#0b1220;">
                <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">
                  What happens next
                </p>
                <p style="margin:0;color:#e2e8f0;line-height:1.7;font-size:14px;">
                  Our recruiting team will review your CV and application details. If your profile
                  matches the role requirements, we will contact you by email with the next step in
                  the selection process.
                </p>
              </div>

              <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.7;font-size:15px;">
                We appreciate your interest in joining our consulting and technology evaluation
                network.
              </p>

              <div style="margin-top:26px;padding-top:18px;border-top:1px solid #273241;">
                <p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;">
                  BECARTH.AI Consulting Recruiting Team
                </p>
                <p style="margin:6px 0 0;color:#64748b;font-size:12px;">
                  This message was sent from BECARTHAI TalentVision.
                </p>
              </div>
            </div>
          </div>
        </div>
      `,
      text: `Hello ${candidateName || "Candidate"},

Thank you for applying to BECARTH.AI Consulting for ${position}.

We have received your application. Our recruiting team will review your CV and application details. If your profile matches the role requirements, we will contact you by email with the next step in the selection process.

BECARTH.AI Consulting Recruiting Team`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send confirmation email: ${errorText}`);
  }
}
