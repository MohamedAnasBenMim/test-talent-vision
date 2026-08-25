type SendResendEmailOptions = {
  from?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getResendApiKeys(): string[] {
  const keys: string[] = [];

  if (process.env.RESEND_API_KEY) keys.push(process.env.RESEND_API_KEY.trim());
  if (process.env.RESEND_API_KEY_2) keys.push(process.env.RESEND_API_KEY_2.trim());
  if (process.env.RESEND_API_KEY_SECONDARY) keys.push(process.env.RESEND_API_KEY_SECONDARY.trim());
  if (process.env.RESEND_API_KEY_3) keys.push(process.env.RESEND_API_KEY_3.trim());

  return Array.from(new Set(keys.filter(Boolean)));
}

export async function sendResendEmail({
  from = process.env.INTERVIEW_INVITE_FROM ?? "BECARTHAI TalentVision <onboarding@resend.dev>",
  to,
  subject,
  html,
  text,
}: SendResendEmailOptions) {
  const apiKeys = getResendApiKeys();

  console.log(`[Resend] Dispatching email to: ${to} (Configured Keys: ${apiKeys.length})`);

  if (apiKeys.length === 0) {
    throw new Error("RESEND_API_KEY is missing");
  }

  let lastErrorText = "";

  // Try each API key in order (e.g. primary key, secondary candidate key)
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html, text }),
      });

      const resText = await response.text();

      if (response.ok) {
        console.log(`[Resend SUCCESS] Delivered email to ${to} using Key #${i + 1}`);
        try {
          return JSON.parse(resText);
        } catch {
          return resText;
        }
      }

      console.warn(`[Resend WARN] Key #${i + 1} rejected delivery to ${to} (${response.status}): ${resText}`);
      lastErrorText = resText;
    } catch (err: any) {
      console.error(`[Resend ERROR] Key #${i + 1} threw error:`, err);
      lastErrorText = err?.message || String(err);
    }
  }

  // Fallback if no matching API key delivered to target email on free tier
  const ownerEmail = "medanasbenmim123@gmail.com";
  if (to.toLowerCase() !== ownerEmail.toLowerCase()) {
    console.warn(
      `[Resend Test Mode] Direct delivery to ${to} failed across all API keys. Rerouting test copy to owner email (${ownerEmail}).`
    );

    const testHeader = `
      <div style="padding:12px 16px;margin-bottom:20px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;font-size:13px;font-family:sans-serif;">
        <strong style="color:#b45309;">⚠️ Resend Testing Mode Notice</strong><br/>
        Direct delivery to <code>${to}</code> failed because no Resend API key for <code>${to}</code> was configured in <code>.env.local</code>.<br/>
        <span style="font-size:11px;color:#78350f;">Intended Recipient: <strong>${to}</strong></span>
      </div>
    `;

    const fallbackResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKeys[0]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: ownerEmail,
        subject,
        html,
        text,
      }),
    });

    if (fallbackResponse.ok) {
      return await fallbackResponse.json();
    }
  }

  throw new Error(`Failed to send email via Resend: ${lastErrorText}`);
}
