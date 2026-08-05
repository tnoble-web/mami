/** The pipeline stages a lead moves through, in order. */
export const STAGES = [
  'new',
  'replied',
  'call-booked',
  'proposal-sent',
  'booked',
  'lost',
] as const;

export type Stage = (typeof STAGES)[number];

/** Stages where the lead is still winnable, so follow-ups should keep going. */
export const OPEN_STAGES: Stage[] = ['new', 'replied'];

/** Stages that mean the conversation is over, one way or the other. */
export const CLOSED_STAGES: Stage[] = ['booked', 'lost'];

export const STAGE_LABELS: Record<Stage, string> = {
  new: 'New',
  replied: 'Replied',
  'call-booked': 'Call booked',
  'proposal-sent': 'Proposal sent',
  booked: 'Booked',
  lost: 'Lost',
};

export type Note = {
  at: string;
  body: string;
};

export type SentFollowUp = {
  key: string;
  at: string;
};

export type Lead = {
  id: string;
  createdAt: string;
  updatedAt: string;

  name: string;
  email: string;
  phone: string | null;

  /** 'YYYY-MM-DD', or null if they have not set a date yet. */
  weddingDate: string | null;
  /** Free text as they typed it — not necessarily a venue in your config. */
  venue: string | null;
  /** Matched slug from config/business.ts venues, when we recognised it. */
  venueSlug: string | null;

  message: string | null;
  /** How they found you: 'website', 'wedding-show', 'instagram', ... */
  source: string;

  stage: Stage;
  notes: Note[];
  followUpsSent: SentFollowUp[];

  /** True once the auto-reply actually went out. */
  autoReplySent: boolean;
  /** Whether their date was open at the time they inquired. */
  dateWasAvailable: boolean | null;
};

export function isStage(value: unknown): value is Stage {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value);
}
