import type { NguBadgeTone } from 'ngu-table/config';

/** The key a status word is looked up by: no case, spaces, dots, dashes or underscores. */
function toneKey(value: string): string {
  return value.toLowerCase().replace(/[\s._-]+/g, '');
}

/** Keys are stripped of case and separators, so `ON_HOLD` and `on hold` are one entry. */
const KNOWN_TONES: Readonly<Record<string, NguBadgeTone>> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  confirmed: 'success',
  delivered: 'success',
  done: 'success',
  paid: 'success',
  success: 'success',
  verified: 'success',
  yes: 'success',
  true: 'success',

  cancelled: 'danger',
  canceled: 'danger',
  deleted: 'danger',
  error: 'danger',
  expired: 'danger',
  failed: 'danger',
  inactive: 'danger',
  locked: 'danger',
  overdue: 'danger',
  rejected: 'danger',
  no: 'danger',
  false: 'danger',

  draft: 'warning',
  hold: 'warning',
  onhold: 'warning',
  partial: 'warning',
  pending: 'warning',
  processing: 'warning',
  inprogress: 'warning',
  waiting: 'warning',

  created: 'info',
  new: 'info',
  open: 'info',
  scheduled: 'info',
  submitted: 'info',
  info: 'info',

  archived: 'neutral',
  closed: 'neutral',
  unknown: 'neutral',
  na: 'neutral',
};

/**
 * The column's map first, then the app's `badgeTones`, then the built-in vocabulary, then
 * neutral.
 *
 * Never a color hashed from the text: an invented color reads as a severity, and a green
 * `AWAITING_PICKUP` says the shipment is fine.
 */
export function badgeTone(
  value: unknown,
  map?: Record<string, NguBadgeTone>,
  appTones?: Readonly<Record<string, NguBadgeTone>>,
): NguBadgeTone {
  if (value === null || value === undefined || value === '') return 'neutral';

  const raw = String(value);
  if (map) {
    const match = map[raw] ?? map[raw.toUpperCase()] ?? map[raw.toLowerCase()];
    if (match) return match;
  }

  const key = toneKey(raw);
  return appTones?.[key] ?? KNOWN_TONES[key] ?? 'neutral';
}

/** "John Doe" → "JD", "alice" → "AL", nothing → "?". */
export function initialsOf(value: unknown): string {
  const name = String(value ?? '').trim();
  if (!name) return '?';

  const parts = name.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);

  return letters.toUpperCase();
}
