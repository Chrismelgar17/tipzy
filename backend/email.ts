/**
 * Mail helper using Brevo (formerly Sendinblue) HTTP API.
 * Uses HTTPS — works on Railway with no SMTP ports needed.
 *
 * Required env vars:
 *   BREVO_API_KEY  — from app.brevo.com → SMTP & API → API Keys
 *   MAIL_FROM      — verified sender email (e.g. tipzy.team@gmail.com)
 *   MAIL_FROM_NAME — display name (optional, defaults to "Tipzy")
 *
 * If BREVO_API_KEY is not set, emails are skipped gracefully.
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_NAME = process.env.MAIL_FROM_NAME ?? "Tipzy";
const DEFAULT_FROM = process.env.MAIL_FROM ?? "tipzy.team@gmail.com";

type MailResult = { messageId: string };

export async function sendEmail(opts: { to: string; subject: string; text: string; html?: string }): Promise<MailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn(`[mail] No BREVO_API_KEY — skipping email to ${opts.to}: "${opts.subject}"`);
    return { messageId: "skipped" };
  }

  const body = JSON.stringify({
    sender: { name: DEFAULT_NAME, email: DEFAULT_FROM },
    to: [{ email: opts.to }],
    subject: opts.subject,
    textContent: opts.text,
    htmlContent: opts.html ?? opts.text,
  });

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[mail] Brevo error ${res.status}:`, err);
    throw new Error(`Email send failed: ${res.status}`);
  }

  const data = await res.json() as { messageId?: string };
  console.log(`[mail] Sent "${opts.subject}" to ${opts.to} — id: ${data.messageId}`);
  return { messageId: data.messageId ?? "ok" };
}





export async function sendVerificationEmail(to: string, token: string) {
  const subject = "Tipzy: Verify your email";
  const text = `Here is your verification code: ${token}\n\nUse it in the Tipzy app.`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0B0B0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0F;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#00D4FF 0%,#0099BB 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:8px;">🍸</div>
          <h1 style="margin:0;color:#FFFFFF;font-size:32px;font-weight:900;letter-spacing:-1px;">TIPZY</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;letter-spacing:1px;text-transform:uppercase;">Nightlife Access</p>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#16161E;padding:40px 40px 32px;text-align:center;">
          <h2 style="margin:0 0 8px;color:#FFFFFF;font-size:22px;font-weight:700;">Verify your email</h2>
          <p style="margin:0 0 32px;color:#9CA3AF;font-size:15px;line-height:1.6;">Use the code below to verify your account and start accessing exclusive venues.</p>

          <!-- CODE BOX -->
          <div style="background:#0B0B0F;border:2px solid #00D4FF;border-radius:12px;padding:24px 32px;display:inline-block;margin-bottom:32px;">
            <p style="margin:0 0 4px;color:#00D4FF;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Verification Code</p>
            <p style="margin:0;color:#FFFFFF;font-size:36px;font-weight:900;letter-spacing:8px;">${token}</p>
          </div>

          <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">This code expires in <strong style="color:#9CA3AF;">24 hours</strong>.<br/>If you didn't create a Tipzy account, you can ignore this email.</p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#0F0F14;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
          <p style="margin:0;color:#374151;font-size:12px;">© 2026 Tipzy · tipzy.team@gmail.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendEmail({ to, subject, text, html });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const subject = "Tipzy: Reset your password";
  const text = `We received a password reset request. Use this code: ${token}\n\nIf you did not request this, ignore this email.`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0B0B0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0F;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#00D4FF 0%,#0099BB 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:8px;">🍸</div>
          <h1 style="margin:0;color:#FFFFFF;font-size:32px;font-weight:900;letter-spacing:-1px;">TIPZY</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;letter-spacing:1px;text-transform:uppercase;">Nightlife Access</p>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#16161E;padding:40px 40px 32px;text-align:center;">
          <h2 style="margin:0 0 8px;color:#FFFFFF;font-size:22px;font-weight:700;">Password Reset</h2>
          <p style="margin:0 0 32px;color:#9CA3AF;font-size:15px;line-height:1.6;">We received a request to reset your password. Use the code below in the app.</p>

          <!-- CODE BOX -->
          <div style="background:#0B0B0F;border:2px solid #00D4FF;border-radius:12px;padding:24px 32px;display:inline-block;margin-bottom:32px;">
            <p style="margin:0 0 4px;color:#00D4FF;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Reset Code</p>
            <p style="margin:0;color:#FFFFFF;font-size:36px;font-weight:900;letter-spacing:8px;">${token}</p>
          </div>

          <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">This code expires in <strong style="color:#9CA3AF;">1 hour</strong>.<br/>If you didn't request a reset, you can safely ignore this email.</p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#0F0F14;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
          <p style="margin:0;color:#374151;font-size:12px;">© 2026 Tipzy · tipzy.team@gmail.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendEmail({ to, subject, text, html });
}

// ── HTML escape helper ───────────────────────────────────────────────────────

function escHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Email row helper ─────────────────────────────────────────────────────────

function emailRow(icon: string, label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0 10px;vertical-align:top;width:28px;font-size:18px;line-height:1;">${icon}</td>
    <td style="padding:10px 10px 10px 8px;vertical-align:top;width:120px;color:#6B7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;white-space:nowrap;">${label}</td>
    <td style="padding:10px 0 10px;vertical-align:top;color:#E5E7EB;font-size:14px;font-weight:500;word-break:break-word;">${value}</td>
  </tr>`;
}

// ── Business approval request email ─────────────────────────────────────────

export interface BusinessApprovalData {
  userId: string;
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  businessCategory?: string | null;
  phone?: string | null;
  address?: string | null;
  capacity?: number | null;
  minAge?: number | null;
  genres?: string[] | null;
  createdAt: string;
}

export async function sendBusinessApprovalRequestEmail(
  business: BusinessApprovalData,
  approvalUrl: string,
): Promise<MailResult> {
  const subject = `🆕 New Business Registration: ${business.businessName}`;
  const genresList = business.genres?.length ? business.genres.join(", ") : "Not specified";
  const registeredAt = new Date(business.createdAt).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const text = [
    `New Business Registration – Pending Approval`,
    ``,
    `Business Name  : ${business.businessName}`,
    `Category       : ${business.businessCategory ?? "Not specified"}`,
    `Owner          : ${business.ownerName}`,
    `Email          : ${business.ownerEmail}`,
    `Phone          : ${business.phone ?? "Not provided"}`,
    `Address        : ${business.address ?? "Not provided"}`,
    `Capacity       : ${business.capacity ?? "Not specified"}`,
    `Min. Age       : ${business.minAge ?? 18}+`,
    `Music/Services : ${genresList}`,
    `Registered     : ${registeredAt}`,
    ``,
    `Click to approve this business:`,
    approvalUrl,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>New Business Registration – Tipzy</title>
</head>
<body style="margin:0;padding:0;background:#0F0F1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F0F1A;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#7C3AED 0%,#A855F7 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:10px;">🍸</div>
          <h1 style="margin:0;color:#FFFFFF;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Tipzy</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.82);font-size:15px;">New Business Registration Request</p>
        </td></tr>

        <!-- ALERT BANNER -->
        <tr><td style="background:#1A1A2E;padding:24px 40px 8px;">
          <div style="background:rgba(124,58,237,0.13);border:1px solid rgba(124,58,237,0.38);border-radius:10px;padding:14px 20px;text-align:center;">
            <p style="margin:0;color:#C4B5FD;font-size:15px;font-weight:600;">⚡ A new venue is waiting for your approval</p>
          </div>
        </td></tr>

        <!-- BUSINESS CARD -->
        <tr><td style="background:#1A1A2E;padding:20px 40px 32px;">
          <div style="background:#16213E;border-radius:14px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">

            <!-- Business name header -->
            <div style="background:rgba(124,58,237,0.2);padding:22px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <h2 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;">${escHtml(business.businessName)}</h2>
              <p style="margin:5px 0 0;color:#A78BFA;font-size:14px;font-weight:500;">${escHtml(business.businessCategory ?? "Uncategorized")}</p>
            </div>

            <!-- Detail rows -->
            <div style="padding:20px 28px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${emailRow("👤", "Owner", escHtml(business.ownerName))}
                ${emailRow("📧", "Email", `<a href="mailto:${escHtml(business.ownerEmail)}" style="color:#A78BFA;text-decoration:none;">${escHtml(business.ownerEmail)}</a>`)}
                ${business.phone ? emailRow("📞", "Phone", escHtml(business.phone)) : ""}
                ${business.address ? emailRow("📍", "Address", escHtml(business.address)) : ""}
                ${business.capacity ? emailRow("👥", "Capacity", `${business.capacity} people`) : ""}
                ${emailRow("🔞", "Min. Age", `${business.minAge ?? 18}+`)}
                ${genresList !== "Not specified" ? emailRow("🎵", "Music / Services", escHtml(genresList)) : ""}
                ${emailRow("📅", "Registered", escHtml(registeredAt))}
              </table>
            </div>

          </div>
        </td></tr>

        <!-- APPROVE BUTTON -->
        <tr><td style="background:#1A1A2E;padding:0 40px 40px;text-align:center;">
          <p style="color:#6B7280;font-size:14px;line-height:1.65;margin:0 0 24px;">
            Review the details above. Click the button below to activate this business account on Tipzy.
          </p>
          <a href="${approvalUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#22C55E 0%,#16A34A 100%);color:#FFFFFF;text-decoration:none;padding:18px 60px;border-radius:50px;font-size:17px;font-weight:700;letter-spacing:0.3px;box-shadow:0 6px 28px rgba(34,197,94,0.38);">
            ✅&nbsp;&nbsp;Approve Business
          </a>
          <p style="color:#374151;font-size:12px;margin:20px 0 0;word-break:break-all;line-height:1.5;">
            Or copy this link:<br/>
            <a href="${approvalUrl}" style="color:#7C3AED;">${approvalUrl}</a>
          </p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#0A0A14;border-radius:0 0 16px 16px;padding:22px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
          <p style="margin:0;color:#374151;font-size:13px;">Sent to tipzy.team@gmail.com · Tipzy Admin</p>
          <p style="margin:6px 0 0;color:#1F2937;font-size:11px;">User ID: ${escHtml(business.userId)}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: "tipzy.team@gmail.com", subject, text, html });
}
