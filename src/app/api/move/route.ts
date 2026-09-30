import { fmtRange, isActiveStatus } from '@/lib/engine';
import { handle, fail, loadSnapshot, ok } from '@/lib/api';
import { insertNotifications, moveAssignment } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/** Applies a staffing move suggestion: re-point the volunteer's current assignment (in from_zone) to the short shift. */
export async function POST(req: Request) {
  const { volunteer_id, from_zone_id, to_shift_id } = (await req.json()) as { volunteer_id?: string; from_zone_id?: string; to_shift_id?: string };
  if (!volunteer_id || !to_shift_id) return fail('volunteer_id and to_shift_id are required');
  return handle(async (db) => {
    const { snap } = await loadSnapshot(db);
    const target = snap.shifts.find((s) => s.id === to_shift_id);
    if (!target) return fail('Target shift not found', 404);
    const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
    const current = snap.assignments.find((a) => {
      const s = shiftById.get(a.shift_id);
      return a.volunteer_id === volunteer_id && isActiveStatus(a.status) && s && s.zone_id === from_zone_id
        && new Date(s.starts_at) < new Date(target.ends_at) && new Date(target.starts_at) < new Date(s.ends_at);
    });
    if (!current) return fail('Volunteer is no longer in that zone at that time');
    const zone = snap.zones.find((z) => z.id === target.zone_id);
    await moveAssignment(current.id, target.id, 'Moved by coordinator to cover a gap', db);
    await insertNotifications([{ volunteer_id, kind: 'assignment', title: `You've been moved to ${zone?.name ?? 'another zone'}`, body: `${target.role_name}, ${fmtRange(target)}` }], db);
    return ok({ moved: current.id });
  });
}
