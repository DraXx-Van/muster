import { COORD, handle, HttpError, loadSnapshot, ok, readJson } from '@/lib/api';
import { offsetFor } from '@/lib/clockMath';
import { setClockOffset } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/**
 * Demo tools. Body: { eventId, deltaMinutes } to time-travel, { time: 'HH:mm' } to jump to a time of day (IST) on the
 * event's first day, or { reset: true } to go back to real time.
 */
export async function POST(req: Request) {
  const b = await readJson<{ eventId?: string; deltaMinutes?: number; time?: string; reset?: boolean }>(req);
  return handle(req, { eventId: b.eventId, roles: COORD }, async ({ db }) => {
    const { snap, now } = await loadSnapshot(db, b.eventId!);
    let offset = snap.event.clock_offset_minutes;
    if (b.reset) offset = 0;
    else if (typeof b.deltaMinutes === 'number') offset += b.deltaMinutes;
    else if (b.time && /^\d{2}:\d{2}$/.test(b.time)) {
      const day = new Date(snap.event.starts_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      offset = offsetFor(new Date(`${day}T${b.time}:00+05:30`));
    } else throw new HttpError(400, 'deltaMinutes, time or reset is required');
    await setClockOffset(snap.event.id, offset, db);
    return ok({ offsetMinutes: offset, before: now.toISOString() });
  });
}
