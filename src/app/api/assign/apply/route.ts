import { fmtRange } from '@/lib/engine';
import { handle, fail, loadSnapshot, ok } from '@/lib/api';
import { insertAssignments, insertNotifications } from '@/lib/db/queries';
import type { NewAssignment } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Writes engine output to the DB and tells each volunteer about their new shift. */
export async function POST(req: Request) {
  const { assignments } = (await req.json()) as { assignments?: NewAssignment[] };
  if (!Array.isArray(assignments)) return fail('assignments[] is required');
  return handle(async (db) => {
    const { snap } = await loadSnapshot(db);
    const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
    const zoneById = new Map(snap.zones.map((z) => [z.id, z]));
    const valid = assignments.filter((a) => shiftById.has(a.shift_id));
    const inserted = await insertAssignments(valid, db);
    await insertNotifications(
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
