import { handle, fail, loadSnapshot, ok } from '@/lib/api';
import { offsetFor } from '@/lib/clockMath';
import { setClockOffset } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/** Body: { deltaMinutes } to time-travel, or { time: 'HH:mm' } to jump to a time of day (IST) on the event day. */
export async function POST(req: Request) {
  const b = (await req.json()) as { deltaMinutes?: number; time?: string };
  return handle(async (db) => {
    const { snap, now } = await loadSnapshot(db);
    let offset = snap.event.clock_offset_minutes;
    if (typeof b.deltaMinutes === 'number') offset += b.deltaMinutes;
    else if (b.time && /^\d{2}:\d{2}$/.test(b.time)) {
      const day = new Date(snap.event.starts_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      offset = offsetFor(new Date(`${day}T${b.time}:00+05:30`));
    } else return fail('deltaMinutes or time is required');
    await setClockOffset(snap.event.id, offset, db);
    return ok({ offsetMinutes: offset, before: now.toISOString() });
  });
}

