/**
 * POST /api/inquiry — the conversion endpoint.
 *
 * Order of operations matters: the lead is SAVED before any email is
 * attempted. Email providers fail, rate-limit and go down; a lost enquiry is
 * a lost wedding. So a send failure is logged and reported, but the lead is
 * already on disk either way, and the couple still gets a success response.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { business } from '@config/business';
import { createLead, updateLead } from '@/lib/store';
import { getDateInfo, isValidDateString } from '@/lib/dateInfo';
import { matchVenueByText } from '@/lib/venues';
import { sendEmail } from '@/lib/mailer';
import { autoReply, notification } from '@/lib/templates';

// Storage writes to disk, so this must not be statically optimised.
export const dynamic = 'force-dynamic';

const InquirySchema = z.object({
  name: z.string().trim().min(1, 'Please tell me your name').max(120),
  email: z.string().trim().email('That email does not look right').max(200),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  weddingDate: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidDateString(v), 'That date does not look right')
    .optional(),
  venue: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().max(4000).optional().or(z.literal('')),
  source: z.string().trim().max(60).optional(),
  /** Honeypot. Bots fill it; people cannot see it. */
  company: z.string().max(200).optional(),
});

function blank(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Could not read that submission.' }, { status: 400 });
  }

  const parsed = InquirySchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '_');
      fieldErrors[key] ??= issue.message;
    }
    return NextResponse.json(
      { error: 'Please check the highlighted fields.', fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Honeypot tripped. Return 200 so the bot believes it succeeded and does not
  // retry with a different shape — but store nothing.
  if (data.company && data.company.trim() !== '') {
    return NextResponse.json({ ok: true, message: 'Thank you.' });
  }

  const weddingDate = blank(data.weddingDate);
  const venueText = blank(data.venue);
  const matchedVenue = matchVenueByText(venueText);
  const dateInfo = weddingDate ? getDateInfo(weddingDate) : null;

  const lead = await createLead({
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: blank(data.phone),
    weddingDate,
    venue: venueText,
    venueSlug: matchedVenue?.slug ?? null,
    message: blank(data.message),
    source: blank(data.source) ?? 'website',
    dateWasAvailable: dateInfo ? dateInfo.available : null,
  });

  // Send both emails in parallel; neither can block the response being a success.
  const reply = autoReply(lead, dateInfo, matchedVenue);
  const notify = notification(lead, dateInfo, matchedVenue);

  const [replyResult, notifyResult] = await Promise.all([
    sendEmail(
      { to: lead.email, subject: reply.subject, html: reply.html, text: reply.text, replyTo: business.replyToEmail },
      business.fromEmail,
    ),
    sendEmail(
      { to: business.notifyEmail, subject: notify.subject, html: notify.html, text: notify.text, replyTo: lead.email },
      business.fromEmail,
    ),
  ]);

  if (replyResult.ok) {
    await updateLead(lead.id, { autoReplySent: true });
  } else {
    // Loud, because a silent failure here means the couple heard nothing.
    console.error(`[inquiry] auto-reply to ${lead.email} FAILED: ${replyResult.error}`);
  }
  if (!notifyResult.ok) {
    console.error(`[inquiry] notification FAILED: ${notifyResult.error}`);
  }

  return NextResponse.json({
    ok: true,
    message: `Thank you — that came through. You will have a reply from me within ${business.humanReplyWithinHours} hours.`,
  });
}
