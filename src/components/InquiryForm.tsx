'use client';

import { useState } from 'react';
import { business } from '@config/business';

type Props = {
  /** Pre-fills the venue field, so a couple arriving from a venue page never retypes it. */
  venueName?: string | null;
  /** Where this submission came from: 'venue-page', 'wedding-show', 'website'. */
  source?: string;
};

type FieldErrors = Record<string, string>;

export function InquiryForm({ venueName = null, source = 'website' }: Props) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    setState('sending');
    setFieldErrors({});

    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setState('error');
        setFieldErrors(data?.fieldErrors ?? {});
        setMessage(
          data?.error ??
            `Something went wrong sending that. Please email ${business.replyToEmail} directly — I do not want to lose your enquiry.`,
        );
        return;
      }

      setState('sent');
      setMessage(
        data?.message ??
          `Thank you — that came through. You will have a reply from me within ${business.humanReplyWithinHours} hours.`,
      );
      form.reset();
    } catch {
      setState('error');
      setMessage(
        `That did not send — you may be offline. Please email ${business.replyToEmail} directly so your enquiry is not lost.`,
      );
    }
  }

  if (state === 'sent') {
    return (
      <div className="form-status form-status--ok" role="status">
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <input type="hidden" name="source" value={source} />

      {/* Bots fill this in; people never see it. Submissions with it set are dropped. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" type="text" required autoComplete="name" />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </div>

        <div className="field">
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>

        <div className="field">
          <label htmlFor="weddingDate">Wedding date (if you have one)</label>
          <input id="weddingDate" name="weddingDate" type="date" />
          {fieldErrors.weddingDate && (
            <span className="field-error">{fieldErrors.weddingDate}</span>
          )}
        </div>

        <div className="field field--wide">
          <label htmlFor="venue">Venue</label>
          <input
            id="venue"
            name="venue"
            type="text"
            defaultValue={venueName ?? ''}
            placeholder="Where are you getting married?"
          />
        </div>

        <div className="field field--wide">
          <label htmlFor="message">Anything you would like me to know</label>
          <textarea id="message" name="message" />
        </div>
      </div>

      <p style={{ marginTop: '1.25rem' }}>
        <button className="btn" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Send enquiry'}
        </button>
      </p>

      {state === 'error' && (
        <div className="form-status form-status--err" role="alert">
          {message}
        </div>
      )}
    </form>
  );
}
