// Time helpers. Pure: nothing here reads the current time.
export const EVENT_TZ = 'Asia/Kolkata';
export const MIN = 60_000;
export const HOUR = 3_600_000;
export const TRAVEL_BUFFER_MS = 15 * MIN; // needed between shifts in DIFFERENT zones

export const ms = (iso: string): number => Date.parse(iso);

export const hoursOf = (s: { starts_at: string; ends_at: string }): number =>
  (ms(s.ends_at) - ms(s.starts_at)) / HOUR;

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: EVENT_TZ,
});
export const fmtTime = (iso: string): string => timeFmt.format(new Date(iso));
export const fmtRange = (s: { starts_at: string; ends_at: string }): string =>
  `${fmtTime(s.starts_at)}-${fmtTime(s.ends_at)}`;
