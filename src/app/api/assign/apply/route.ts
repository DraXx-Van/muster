import { fmtRange } from '@/lib/engine';
import { COORD, handle, HttpError, loadSnapshot, ok, readJson } from '@/lib/api';
import { insertAssignments, insertNotifications } from '@/lib/db/queries';
import type { NewAssignment } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Writes engine output to the DB and tells each volunteer about their new shift. */
export async function POST(req: Request) {
  const { eventId, assignments } = await readJson<{ eventId?: string; assignments?: NewAssignment[] }>(req);
  return handle(req, { eventId, roles: COORD }, async ({ db }) => {
    if (!Array.isArray(assignments)) throw new HttpError(400, 'assignments[] is required');
    const { snap } = await loadSnapshot(db, eventId!);
    const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
    const zoneById = new Map(snap.zones.map((z) => [z.id, z]));
    const volIds = new Set(snap.volunteers.map((v) => v.id));
    const valid = assignments.filter((a) => shiftById.has(a.shift_id) && volIds.has(a.volunteer_id));
    const inserted = await insertAssignments(eventId!, valid, db);
    await insertNotifications(
      eventId!,
      inserted.map((a) => {
        const s = shiftById.get(a.shift_id)!;
        return {
          volunteer_id: a.volunteer_id,
          kind: 'assignment' as const,
          title: `You've been assigned to ${zoneById.get(s.zone_id)?.name ?? 'a zone'}`,
          body: `${s.role_name}, ${fmtRange(s)}`,
        };
      }),
      db,
    );
    return ok({ inserted: inserted.length });
  });
}
