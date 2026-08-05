/**
 * Email sending.
 *
 * Works with no configuration at all: if RESEND_API_KEY is missing, every
 * message is written to .outbox/ as an .html file and logged. That means you
 * can build and test the whole inquiry flow before signing up for anything,
 * and going live is one environment variable.
 *
 * Resend is called over plain fetch rather than its SDK — one less dependency,
 * and the API is a single POST.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type SendResult = { ok: true; via: 'resend' | 'outbox' } | { ok: false; error: string };

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

const OUTBOX_DIR = process.env.OUTBOX_DIR || path.join(process.cwd(), '.outbox');

export function emailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(email: Email, from: string): Promise<SendResult> {
  if (!emailProviderConfigured()) {
    return writeToOutbox(email, from);
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `Resend returned ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true, via: 'resend' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown send failure' };
  }
}

async function writeToOutbox(email: Email, from: string): Promise<SendResult> {
  try {
    await fs.mkdir(OUTBOX_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTo = email.to.replace(/[^a-z0-9@._-]/gi, '_');
    const file = path.join(OUTBOX_DIR, `${stamp}--${safeTo}.html`);

    const header =
      `<!-- FROM: ${from} -->\n` +
      `<!-- TO: ${email.to} -->\n` +
      `<!-- SUBJECT: ${email.subject} -->\n` +
      (email.replyTo ? `<!-- REPLY-TO: ${email.replyTo} -->\n` : '');

    await fs.writeFile(file, header + email.html, 'utf8');

    console.log(
      `[mailer] No RESEND_API_KEY set — wrote email to ${file}\n` +
        `         To: ${email.to}\n         Subject: ${email.subject}`,
    );
    return { ok: true, via: 'outbox' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not write to outbox' };
  }
}
