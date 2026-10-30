/**
 * Outgoing e-mail for public proposals, through the owner's own SMTP account
 * (Gmail with an app password, Outlook, any provider). Credentials live only in
 * environment variables. Nothing is stored on the server.
 */
import nodemailer from "nodemailer";

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  to: string;
  from: string;
}

function config(): MailConfig | undefined {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const to = process.env.CONTACT_TO?.trim();
  if (!host || !user || !pass || !to) return undefined;
  const port = Number(process.env.SMTP_PORT ?? 465);
  return {
    host,
    port,
    secure: (process.env.SMTP_SECURE ?? (port === 465 ? "true" : "false")) === "true",
    user,
    pass,
    to,
    from: process.env.CONTACT_FROM?.trim() || user,
  };
}

export const isMailConfigured = () => config() !== undefined;

export interface OutgoingMail {
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Uint8Array; contentType: string }>;
}

export async function sendProposalMail(mail: OutgoingMail): Promise<void> {
  const cfg = config();
  if (!cfg) throw new Error("El envío por correo no está configurado");
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  await transport.sendMail({
    from: { name: "España Industrial", address: cfg.from },
    to: cfg.to,
    subject: mail.subject,
    text: mail.text,
    ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    ...(mail.attachments?.length
      ? {
          attachments: mail.attachments.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content),
            contentType: a.contentType,
          })),
        }
      : {}),
  });
}
