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
