import type { Metadata } from 'next';
import { business } from '@config/business';
import { InquiryForm } from '@/components/InquiryForm';

export const metadata: Metadata = {
  title: `Enquire | ${business.shortName}`,
  description: `Tell me your date and venue and I will come back to you within ${business.humanReplyWithinHours} hours.`,
  // A bare form page has nothing to rank for and would only compete with
  // your real pages, so keep it out of the index.
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ source?: string; venue?: string }> };

/**
 * Standalone enquiry page.
 *
 * The `source` and `venue` query params are what make this useful beyond the
 * website: print a QR code pointing at /inquire?source=wedding-show on your
 * booth signage and brochures, and every lead from the show is tagged as
 * such, so you can tell later what the booth actually earned you.
 */
export default async function InquirePage({ searchParams }: Props) {
  const { source, venue } = await searchParams;
  const isShow = source === 'wedding-show';

  return (
    <div className="wrap">
      <header className="venue-head">
        <h1>{isShow ? 'Lovely to meet you' : 'Tell me about your wedding'}</h1>
        <div className="measure">
          <p>
            {isShow
              ? `Thank you for stopping by. Leave your date below and I will be in touch within ${business.humanReplyWithinHours} hours — while the day is still fresh.`
              : `Leave your date and venue and I will come back to you within ${business.humanReplyWithinHours} hours with whether it is open.`}
          </p>
        </div>
      </header>

      <section className="cta">
        <InquiryForm venueName={venue ?? null} source={source ?? 'website'} />
      </section>
    </div>
  );
}
