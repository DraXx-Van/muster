import { fmtRange, isActiveStatus } from '@/lib/engine';
import { COORD, handle, HttpError, loadSnapshot, ok, readJson } from '@/lib/api';
import { insertNotifications, moveAssignment } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/** Applies a staffing move suggestion: re-point the volunteer's current assignment (in from_zone) to the short shift. */
export async function POST(req: Request) {
  const { eventId, volunteer_id, from_zone_id, to_shift_id } = await readJson<{ eventId?: string; volunteer_id?: string; from_zone_id?: string; to_shift_id?: string }>(req);
  return handle(req, { eventId, roles: COORD }, async ({ db }) => {
    if (!volunteer_id || !to_shift_id) throw new HttpError(400, 'volunteer_id and to_shift_id are required');
    const { snap } = await loadSnapshot(db, eventId!);
    const target = snap.shifts.find((s) => s.id === to_shift_id);
    if (!target) throw new HttpError(404, 'Target shift not found');
    const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
    const current = snap.assignments.find((a) => {
      const s = shiftById.get(a.shift_id);
      return a.volunteer_id === volunteer_id && isActiveStatus(a.status) && s && s.zone_id === from_zone_id
        && new Date(s.starts_at) < new Date(target.ends_at) && new Date(target.starts_at) < new Date(s.ends_at);
    });
    if (!current) throw new HttpError(400, 'Volunteer is no longer in that zone at that time');
    const zone = snap.zones.find((z) => z.id === target.zone_id);
    await moveAssignment(current.id, target.id, 'Moved by coordinator to cover a gap', db);
    await insertNotifications(eventId!, [{ volunteer_id, kind: 'assignment', title: `You've been moved to ${zone?.name ?? 'another zone'}`, body: `${target.role_name}, ${fmtRange(target)}` }], db);
    return ok({ moved: current.id });
  });
}
