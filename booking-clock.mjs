// Server-authoritative booking cutoff for pizza day, in the venue's time zone.
export function slotHasPassed(slot, now = new Date()) {
  const date = process.env.EVENT_DATE || '2026-11-04';
  const zone = process.env.EVENT_TIMEZONE || 'Europe/London';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map(p => [p.type, p.value]));
  const today = parts.year + '-' + parts.month + '-' + parts.day;
  return today > date || (today === date && parts.hour + ':' + parts.minute >= slot);
}
