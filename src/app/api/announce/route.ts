import { COORD, handle, HttpError, loadSnapshot, ok, readJson } from '@/lib/api';
import { insertAnnouncement, insertNotifications } from '@/lib/db/queries';
import { isActiveStatus } from '@/lib/engine';
import type { AnnouncementAudience } from '@/lib/types';

export const dynamic = 'force-dynamic';

const AUDIENCES: AnnouncementAudience[] = ['all', 'volunteers', 'attendees', 'zone', 'role'];

/**
 * Broadcast to everyone, volunteers, attendees, one zone or one shift role.
 * Volunteers get a notification each (live toast); attendees read the announcement in their feed.
 */
export async function POST(req: Request) {
  const b = await readJson<{ eventId?: string; audience?: AnnouncementAudience; zone_id?: string | null; role_name?: string | null; title?: string; body?: string; urgent?: boolean }>(req);
  return handle(req, { eventId: b.eventId, roles: COORD }, async ({ db, user }) => {
    if (!b.audience || !AUDIENCES.includes(b.audience) || !b.title?.trim() || !b.body?.trim()) throw new HttpError(400, 'audience, title and body are required');
    if (b.audience === 'zone' && !b.zone_id) throw new HttpError(400, 'Pick a zone');
    if (b.audience === 'role' && !b.role_name) throw new HttpError(400, 'Pick a role');
    const { snap } = await loadSnapshot(db, b.eventId!);
    const me = snap.volunteers.find((v) => v.user_id === user.id);
    const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));

    const recipients = new Set<string>();
    if (b.audience === 'all' || b.audience === 'volunteers') {
      snap.volunteers.forEach((v) => recipients.add(v.id));
    } else if (b.audience === 'zone' || b.audience === 'role') {
      for (const a of snap.assignments) {
        const s = shiftById.get(a.shift_id);
        if (!s || (!isActiveStatus(a.status) && a.status !== 'checked_in')) continue;
        if (b.audience === 'zone' ? s.zone_id === b.zone_id : s.role_name === b.role_name) recipients.add(a.volunteer_id);
      }
      if (b.audience === 'zone') {
        const coord = snap.zones.find((z) => z.id === b.zone_id)?.coordinator_id;
        if (coord) recipients.add(coord);
      }
    }
    // the sender does not need an alert about their own message
    if (me) recipients.delete(me.id);

    const ann = await insertAnnouncement({
      event_id: b.eventId!, audience: b.audience, zone_id: b.audience === 'zone' ? b.zone_id! : null,
      role_name: b.audience === 'role' ? b.role_name! : null, title: b.title.trim(), body: b.body.trim(),
      urgent: !!b.urgent, created_by: me?.id ?? null,
    }, db);
    await insertNotifications(b.eventId!, [...recipients].map((volunteer_id) => ({
      volunteer_id, kind: 'announcement' as const, title: (b.urgent ? 'URGENT: ' : '') + b.title!.trim(), body: b.body!.trim(),
    })), db);
    const attendees = b.audience === 'all' || b.audience === 'attendees' ? snap.attendees.length : 0;
    return ok({ announcement: ann, recipients: recipients.size, attendees });
  });
}
