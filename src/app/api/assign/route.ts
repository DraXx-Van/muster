import { autoAssign, naiveAssign } from '@/lib/engine';
import { COORD, handle, loadSnapshot, ok, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Preview only (nothing is written): runs the engine and the naive baseline on the current state of one event. */
export async function POST(req: Request) {
  const { eventId } = await readJson<{ eventId?: string }>(req);
  return handle(req, { eventId, roles: COORD }, async ({ db }) => {
    const { snap } = await loadSnapshot(db, eventId!);
    const input = {
      volunteers: snap.volunteers.filter((v) => v.role === 'volunteer'),
      shifts: snap.shifts,
      existing: snap.assignments,
    };
    return ok({ engine: autoAssign(input), naive: naiveAssign(input) });
  });
}
