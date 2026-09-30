import { autoAssign, naiveAssign } from '@/lib/engine';
import { handle, loadSnapshot, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Preview only (nothing is written): runs the engine and the naive baseline on the current state. */
export async function POST() {
  return handle(async (db) => {
    const { snap } = await loadSnapshot(db);
    const input = {
      volunteers: snap.volunteers.filter((v) => v.role === 'volunteer'),
      shifts: snap.shifts,
      existing: snap.assignments,
    };
    return ok({ engine: autoAssign(input), naive: naiveAssign(input) });
  });
}
