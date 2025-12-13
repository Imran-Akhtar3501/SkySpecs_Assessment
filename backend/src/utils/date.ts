/**
 * Normalizes a date to midnight (00:00:00) for date-only comparisons.
 * This ensures that inspections on the same calendar date are considered overlapping,
 * regardless of the time component.
 */
export function normalizeToDateOnly(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const normalized = new Date(d);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

