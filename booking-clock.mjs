// Server-authoritative booking cutoff for pizza day, in the venue's time zone.
// The clock formatter is built once per time zone and reused: building it on every call was
// the single biggest CPU cost of /api/config (it runs once per collection time on every refresh).
const formatters = new Map();
function formatterFor(zone) {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
    formatters.set(zone, formatter);
  }
  return formatter;
}
export const DEFAULT_EVENT_DATE = process.env.EVENT_DATE || '2026-11-04';
// Today's date ("YYYY-MM-DD") and time ("HH:MM") at the venue.
export function venueNow(now = new Date()) {
  const zone = process.env.EVENT_TIMEZONE || 'Europe/London';
  const parts = Object.fromEntries(formatterFor(zone).formatToParts(now).map(p => [p.type, p.value]));
  return { date: parts.year + '-' + parts.month + '-' + parts.day, time: parts.hour + ':' + parts.minute };
}
// `date` is the event day set on the kitchen board; falls back to EVENT_DATE / 4 Nov 2026.
export function slotHasPassed(slot, now = new Date(), date = DEFAULT_EVENT_DATE) {
  const { date: today, time } = venueNow(now);
  return today > date || (today === date && time >= slot);
}
// True once the event day is over (used to delete phone numbers and notification details).
export function eventIsOver(date = DEFAULT_EVENT_DATE, now = new Date()) {
  return venueNow(now).date > date;
}
