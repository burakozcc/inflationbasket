/**
 * Format ISO date (YYYY-MM-DD) or Date to DD/MM/YYYY for UI.
 * Avoids locale-dependent parsing; use only for display.
 */
export function formatTRDate(isoOrDate: string | Date): string {
  if (isoOrDate instanceof Date) {
    const d = isoOrDate;
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const s = (isoOrDate ?? '').trim();
  if (s.length < 10) return s;
  const yyyy = s.slice(0, 4);
  const mm = s.slice(5, 7);
  const dd = s.slice(8, 10);
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD for Supabase.
 */
export function toISODateFromTR(ddmmyyyy: string): string {
  const trimmed = (ddmmyyyy ?? '').trim();
  if (!trimmed) throw new Error('Date is required');
  const parts = trimmed.split('/');
  if (parts.length !== 3) throw new Error('Invalid date format. Use DD/MM/YYYY.');
  const [dd, mm, yyyy] = parts;
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  const parsed = new Date(iso + 'T12:00:00Z');
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date.');
  return iso;
}

/**
 * Convert MM/DD/YYYY to YYYY-MM-DD for Supabase (e.g. AddEntry US-style input).
 */
export function toISODateFromUS(mmddyyyy: string): string {
  return toISODate(mmddyyyy);
}

/**
 * Converts a date string to ISO format (YYYY-MM-DD).
 * Accepts MM/DD/YYYY or already YYYY-MM-DD.
 * @throws Error if the date is invalid
 */
export function toISODate(input: string): string {
  const trimmed = (input ?? '').trim();
  if (!trimmed) throw new Error('Date is required');

  let iso: string;
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length !== 3) throw new Error('Invalid date format. Use MM/DD/YYYY or YYYY-MM-DD.');
    const [mm, dd, yyyy] = parts;
    iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  } else {
    iso = trimmed;
  }

  const withNoon = iso.length === 10 ? `${iso}T12:00:00Z` : iso;
  const parsed = new Date(withNoon);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date.');
  return iso.length === 10 ? iso : parsed.toISOString().slice(0, 10);
}
