/**
 * Email copy for inquiries.
 *
 * The auto-reply has one job that matters more than anything else: answer the
 * availability question immediately. A couple who emails five photographers
 * and gets one instant, specific, honest answer about their own date
 * remembers that one. Everything else here is secondary to that.
 *
 * Every email is sent as both HTML and plain text, because a text part
 * meaningfully improves deliverability and some clients only show it.
 */

import { business } from '@config/business';
import type { DateInfo } from './dateInfo';
import type { Lead } from './types';
import type { Venue } from '@content/venues/types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** First name only — "Hi Sarah" reads better than "Hi Sarah Thompson-Whyte". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

function paragraphsToHtml(paragraphs: string[]): string {
  return paragraphs
    .map((p) => `<p style="margin:0 0 16px;">${p}</p>`)
    .join('\n');
}

function wrapHtml(bodyParagraphs: string[]): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fbf9f6;">
<div style="max-width:560px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.65;color:#241f1b;">
${paragraphsToHtml(bodyParagraphs)}
</div>
</body></html>`;
}

/**
 * Builds the availability sentence — the most important line in the email.
 *
 * Honesty here is not optional. Telling someone a date is open when it is not
 * costs you the booking and the reputation; the bookedDates list in
 * config/business.ts is what keeps this true.
 */
function availabilityLines(dateInfo: DateInfo | null): string[] {
  if (!dateInfo) {
    return [
      'You did not mention a date — if you have one in mind, send it over and I will tell you straight away whether it is open.',
    ];
  }

  if (!dateInfo.available) {
    return [
      `I have to be straight with you: ${dateInfo.pretty} is already booked, so I cannot photograph that date.`,
      'If your date has any flexibility at all, tell me and I will let you know what is close. And if it does not, I would still rather point you towards someone whose work I trust than leave you searching — just ask.',
    ];
  }

  const urgency =
    dateInfo.isSaturday && dateInfo.isPeakSeason
      ? ` A ${dateInfo.dayName} in ${dateInfo.monthName} is the busiest kind of date there is, so it will not stay open indefinitely — but it is open right now.`
      : '';

  return [`Good news first: ${dateInfo.pretty} is open in my calendar.${urgency}`];
}

function venueLine(venue: Venue | null, rawVenue: string | null): string | null {
  if (venue) {
    const shot = venue.shotCount
      ? `I have photographed ${venue.shotCount} ${venue.shotCount === 1 ? 'wedding' : 'weddings'} at ${venue.name}`
      : `I have photographed at ${venue.name}`;
    return `${shot}, so I know the property — where the light is good, and what to do with it if the weather turns. There is more about shooting there on my site if it is useful.`;
  }
  if (rawVenue) {
    return `I have not photographed at ${rawVenue} yet, which I mention only because I would want to visit beforehand rather than turn up cold on the day.`;
  }
  return null;
}

function callToAction(): string {
  if (business.bookingLink) {
    return `The easiest next step is a short call — you can pick a time that suits you here: ${business.bookingLink}`;
  }
  return 'The easiest next step is a short call. Send me two or three times that suit you over the next week and I will make one of them work.';
}

export function autoReply(
  lead: Lead,
  dateInfo: DateInfo | null,
  venue: Venue | null,
): { subject: string; html: string; text: string } {
  const name = firstName(lead.name);
  const who = business.photographerFirstName;

  const subject = dateInfo
    ? `Your ${dateInfo.monthName} ${dateInfo.year} wedding — ${dateInfo.available ? 'the date is open' : 'about your date'}`
    : 'Thank you for getting in touch';

  const paragraphs: string[] = [
    `Hi ${name},`,
    'Thank you for getting in touch — it genuinely made my morning.',
    ...availabilityLines(dateInfo),
  ];

  const vLine = venueLine(venue, lead.venue);
  if (vLine) paragraphs.push(vLine);

  // When the date is gone, the paragraph above already gave them the next
  // step. Pushing a booking call straight after "I cannot photograph that
  // date" reads as if nobody read their email.
  const dateIsGone = dateInfo !== null && !dateInfo.available;
  if (!dateIsGone) paragraphs.push(callToAction());

  if (business.pricingLink) {
    paragraphs.push(
      `If you would rather look at packages first, they are here: ${business.pricingLink}`,
    );
  }

  paragraphs.push(
    `This note was sent automatically so you were not left waiting — but I read every enquiry myself, and you will hear from me personally within ${business.humanReplyWithinHours} hours.`,
    `Warmly,<br>${who}<br>${business.name}`,
  );

  const text = paragraphs
    .map((p) => p.replace(/<br>/g, '\n').replace(/<[^>]+>/g, ''))
    .join('\n\n');

  return {
    subject,
    html: wrapHtml(paragraphs.map((p) => (p.includes('<br>') ? p : escapeHtml(p)))),
    text,
  };
}

/**
 * The notification to you. Written to be readable on a phone lock screen —
 * the whole point is that you can decide whether to stop what you are doing.
 */
export function notification(
  lead: Lead,
  dateInfo: DateInfo | null,
  venue: Venue | null,
): { subject: string; html: string; text: string } {
  const availability = dateInfo
    ? dateInfo.available
      ? 'OPEN'
      : 'ALREADY BOOKED'
    : 'no date given';

  const subject = `New enquiry — ${lead.name}${dateInfo ? ` — ${dateInfo.pretty} (${availability})` : ''}`;

  const rows: [string, string][] = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone ?? '—'],
    ['Date', dateInfo ? `${dateInfo.pretty} — ${availability}` : '—'],
    [
      'Venue',
      lead.venue ? `${lead.venue}${venue ? ` (matched: ${venue.slug})` : ' (no page yet)'}` : '—',
    ],
    ['Source', lead.source],
    ['Message', lead.message ?? '—'],
  ];

  if (dateInfo?.available) {
    rows.push(['Days away', String(dateInfo.daysUntil)]);
  }

  const html = wrapHtml([
    `<strong>New enquiry from ${escapeHtml(lead.name)}</strong>`,
    rows
      .map(([k, v]) => `<strong>${k}:</strong> ${escapeHtml(v).replace(/\n/g, '<br>')}`)
      .join('<br>'),
    `Reply within ${business.humanReplyWithinHours} hours — that promise is in their auto-reply.`,
  ]);

  const text = [
    `New enquiry from ${lead.name}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Reply within ${business.humanReplyWithinHours} hours.`,
  ].join('\n');

  return { subject, html, text };
}
