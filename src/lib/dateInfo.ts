import { bookedDates, peakSeasonMonths } from '@config/business';

/**
 * Wedding date intelligence.
 *
 * All parsing and formatting is done in UTC on purpose. A 'YYYY-MM-DD' string
 * parsed as local time and then formatted in another zone can slide by a day,
 * and telling a couple the wrong day of the week for their own wedding is not
 * a small error.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export type DateInfo = {
  iso: string;
  /** e.g. 'Saturday, 12 June 2027' */
  pretty: string;
  dayName: string;
  monthName: string;
  year: number;
  isSaturday: boolean;
  isPeakSeason: boolean;
  daysUntil: number;
  /** False when the date is in your bookedDates list. */
  available: boolean;
};

export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  // Rejects things like 2027-02-31, which would otherwise roll over silently.
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

export function getDateInfo(iso: string, now: Date = new Date()): DateInfo | null {
  if (!isValidDateString(iso)) return null;

  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysUntil = Math.round((date.getTime() - todayUtc) / 86_400_000);

  const dayName = DAY_NAMES[date.getUTCDay()];
  const monthName = MONTH_NAMES[m - 1];

  return {
    iso,
    pretty: `${dayName}, ${d} ${monthName} ${y}`,
    dayName,
    monthName,
    year: y,
    isSaturday: date.getUTCDay() === 6,
    isPeakSeason: peakSeasonMonths.includes(m),
    daysUntil,
    available: !bookedDates.includes(iso),
  };
}
