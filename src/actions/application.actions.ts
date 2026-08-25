"use server";

import { api } from "../../convex/_generated/api";
import { currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { sendResendEmail } from "@/lib/resend";

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

  const safeName = escapeHtml(candidateName || "Candidate");
  const safePosition = escapeHtml(position);

  await sendResendEmail({
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
  });
}

export async function sendApplicationConfirmationEmail({
  candidateEmail,
  candidateName,
  position,
}: SendApplicationConfirmationArgs) {
  const safeName = escapeHtml(candidateName || "Candidate");
  const safePosition = escapeHtml(position);

  await sendResendEmail({
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
  });
}

export async function sendHrShortlistEmail({
  candidateEmail,
  candidateName,
  position,
}: {
  candidateEmail: string;
  candidateName: string;
  position: string;
}) {
  await assertInterviewer();

  const safeName = escapeHtml(candidateName || "Candidate");
  const safePosition = escapeHtml(position);

  await sendResendEmail({
    to: candidateEmail,
    subject: `Shortlisted for Executive HR Interview - BECARTH.AI Consulting (${position})`,
    html: `
      <div style="margin:0;padding:36px 18px;background:#08111f;font-family:Arial,Helvetica,sans-serif;color:#f8fafc;">
        <div style="max-width:640px;margin:0 auto;border:1px solid #243041;border-radius:12px;background:#101722;overflow:hidden;box-shadow:0 18px 42px rgba(0,0,0,0.28);">
          <div style="height:5px;background:linear-gradient(90deg,#10b981,#06b6d4,#c653f1);"></div>
          <div style="padding:30px;">
            <div style="margin:0 0 24px;">
              <p style="margin:0;color:#10b981;font-size:12px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;">
                BECARTH.AI Consulting • Executive HR Selection
              </p>
            </div>

            <h1 style="margin:0 0 16px;font-size:28px;line-height:1.22;color:#ffffff;">
              Congratulations! You are Shortlisted for HR Interview 🎉
            </h1>

            <p style="margin:0 0 18px;color:#dbeafe;line-height:1.7;font-size:15px;">
              Hello ${safeName},
            </p>
            <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.7;font-size:15px;">
              We are pleased to inform you that following your evaluations for the
              <strong style="color:#ffffff;">${safePosition}</strong> position, your profile has been selected and shortlisted for the final Executive HR interview round.
            </p>

            <div style="margin:24px 0;padding:18px;border:1px solid #059669;border-radius:10px;background:#064e3b20;">
              <p style="margin:0 0 8px;color:#10b981;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">
                Next Step: Final HR Interview Schedule
              </p>
              <p style="margin:0;color:#e2e8f0;line-height:1.7;font-size:14px;">
                Our HR Talent Acquisition team will reach out directly to schedule your final executive HR interview slot.
              </p>
            </div>

            <div style="margin-top:26px;padding-top:18px;border-top:1px solid #273241;">
              <p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;">
                BECARTH.AI Consulting Recruiting Team
              </p>
            </div>
          </div>
        </div>
      </div>
    `,
    text: `Hello ${candidateName || "Candidate"},

Congratulations! You have been shortlisted for the final Executive HR Interview for the position of ${position} at BECARTH.AI Consulting. Our HR team will reach out to schedule your final interview.

BECARTH.AI Consulting Recruiting Team`,
  });
}

export async function sendJobOfferEmail({
  candidateEmail,
  candidateName,
  position,
}: {
  candidateEmail: string;
  candidateName: string;
  position: string;
}) {
  await assertInterviewer();

  const safeName = escapeHtml(candidateName || "Candidate");
  const safePosition = escapeHtml(position);

  await sendResendEmail({
    to: candidateEmail,
    subject: `Official Job Offer - ${position} at BECARTH.AI Consulting`,
    html: `
      <div style="margin:0;padding:36px 18px;background:#08111f;font-family:Arial,Helvetica,sans-serif;color:#f8fafc;">
        <div style="max-width:640px;margin:0 auto;border:1px solid #243041;border-radius:12px;background:#101722;overflow:hidden;box-shadow:0 18px 42px rgba(0,0,0,0.28);">
          <div style="height:5px;background:linear-gradient(90deg,#8b5cf6,#ec4899,#10b981);"></div>
          <div style="padding:30px;">
            <div style="margin:0 0 24px;">
              <p style="margin:0;color:#8b5cf6;font-size:12px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;">
                BECARTH.AI Consulting • Career Offer
              </p>
            </div>

            <h1 style="margin:0 0 16px;font-size:28px;line-height:1.22;color:#ffffff;">
              Official Job Offer! 🌟
            </h1>

            <p style="margin:0 0 18px;color:#dbeafe;line-height:1.7;font-size:15px;">
              Dear ${safeName},
            </p>
            <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.7;font-size:15px;">
              We are delighted to extend an official job offer for the position of
              <strong style="color:#ffffff;">${safePosition}</strong> at BECARTH.AI Consulting!
            </p>
            <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.7;font-size:15px;">
              Your technical excellence, problem-solving skills, and interview performance impressed our evaluation team. Our HR team will send your detailed formal offer contract and onboarding instructions shortly.
            </p>

            <div style="margin-top:26px;padding-top:18px;border-top:1px solid #273241;">
              <p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;">
                Welcome to BECARTH.AI Consulting!
              </p>
            </div>
          </div>
        </div>
      </div>
    `,
    text: `Dear ${candidateName || "Candidate"},

We are delighted to extend an official job offer for the position of ${position} at BECARTH.AI Consulting!

Our HR team will reach out with your formal offer contract.

BECARTH.AI Consulting Recruiting Team`,
  });
}
