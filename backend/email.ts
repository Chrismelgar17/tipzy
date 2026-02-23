/**
 * Minimal mail helper using Nodemailer. Falls back to an Ethereal test
 * account when SMTP credentials are not provided, so we can preview
 * emails during development without sending real mail.
 */
import nodemailer from "nodemailer";

const DEFAULT_FROM = process.env.MAIL_FROM ?? "tipzy.team@gmail.com";
const DEFAULT_NAME = process.env.MAIL_FROM_NAME ?? "Tipzy";

type MailResult = { messageId: string; previewUrl?: string };

type TransportBundle = {
  transporter: nodemailer.Transporter;
  from: string;
  isTest: boolean;
};

let transportPromise: Promise<TransportBundle> | null = null;

async function createTransport(): Promise<TransportBundle> {
  const host = process.env.SMTP_HOST;
  if (host) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) throw new Error("SMTP_USER and SMTP_PASS are required when SMTP_HOST is set");

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    return { transporter, from: `${DEFAULT_NAME} <${DEFAULT_FROM}>`, isTest: false };
  }

  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return { transporter, from: `${DEFAULT_NAME} <${DEFAULT_FROM}>`, isTest: true };
}

async function getTransport() {
  if (!transportPromise) transportPromise = createTransport();
  return transportPromise;
}

export async function sendEmail(opts: { to: string; subject: string; text: string; html?: string }): Promise<MailResult> {
  const transport = await getTransport();
  const info = await transport.transporter.sendMail({ from: transport.from, to: opts.to, subject: opts.subject, text: opts.text, html: opts.html });
  const previewUrl = transport.isTest ? nodemailer.getTestMessageUrl(info) ?? undefined : undefined;
  if (previewUrl) console.log(`[mail] Preview ${opts.subject}: ${previewUrl}`);
  return { messageId: info.messageId, previewUrl };
}

export async function sendVerificationEmail(to: string, token: string) {
  const subject = "Tipzy: Verify your email";
  const text = `Here is your verification code: ${token}\n\nUse it in the Tipzy app or POST /api/customer/verify with { "token": "${token}" }.`;
  const html = `<p>Here is your verification code:</p><p style="font-size:18px;font-weight:bold;">${token}</p><p>Use it in the Tipzy app or POST /api/customer/verify with the code above.</p>`;
  return sendEmail({ to, subject, text, html });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const subject = "Tipzy: Reset your password";
  const text = `We received a password reset request. Use this code: ${token}\n\nPOST /api/customer/reset-password with { "token": "${token}", "newPassword": "<your new password>" }. If you did not request this, ignore this email.`;
  const html = `<p>We received a password reset request.</p><p style="font-size:18px;font-weight:bold;">${token}</p><p>POST /api/customer/reset-password with the code above and your new password. If you did not request this, you can ignore this email.</p>`;
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
