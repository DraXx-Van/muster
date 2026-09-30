import { suggestReplacements } from '@/lib/engine';
import { handle, fail, loadSnapshot, ok } from '@/lib/api';
import { setAssignmentStatus } from '@/lib/db/queries';
import type { Assignment } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Body: { assignmentId, status: 'dropped' | 'no_show' }  -> marks the seat empty, returns ranked replacements
 *    or { shiftId }                                        -> replacements for an open seat (gap), nothing is written
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { assignmentId?: string; status?: 'dropped' | 'no_show'; shiftId?: string };
  return handle(async (db) => {
    let { snap, now } = await loadSnapshot(db);
    let dropped: Assignment;
    if (body.assignmentId) {
      const found = snap.assignments.find((a) => a.id === body.assignmentId);
      if (!found) return fail('Assignment not found', 404);
      await setAssignmentStatus(found.id, body.status ?? 'dropped', now, db);
      ({ snap, now } = await loadSnapshot(db));
      dropped = snap.assignments.find((a) => a.id === found.id)!;
    } else if (body.shiftId) {
      // synthetic "dropped" row so the engine treats this as a seat to fill
      dropped = { id: 'open-seat', shift_id: body.shiftId, volunteer_id: '', status: 'dropped', score: null, reason: null, checked_in_at: null, checked_out_at: null };
    } else return fail('assignmentId or shiftId is required');

    const t0 = performance.now();
    const suggestions = suggestReplacements(
      { volunteers: snap.volunteers.filter((v) => v.role === 'volunteer'), shifts: snap.shifts, existing: snap.assignments },
      dropped, now,
    );
    return ok({ shift_id: dropped.shift_id, suggestions, computeMs: Math.round((performance.now() - t0) * 100) / 100 });
  });
}
