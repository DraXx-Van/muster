import { handle, fail, loadSnapshot, ok } from '@/lib/api';
import { insertAnnouncement, insertNotifications } from '@/lib/db/queries';
import { isActiveStatus } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** Broadcast to everyone, one zone, or one shift role; fans out one notification per recipient. */
export async function POST(req: Request) {
  const b = (await req.json()) as { audience?: 'all' | 'zone' | 'role'; zone_id?: string | null; role_name?: string | null; title?: string; body?: string; urgent?: boolean; created_by?: string | null };
  if (!b.audience || !b.title?.trim() || !b.body?.trim()) return fail('audience, title and body are required');
  if (b.audience === 'zone' && !b.zone_id) return fail('Pick a zone');
  if (b.audience === 'role' && !b.role_name) return fail('Pick a role');
  return handle(async (db) => {
    const { snap } = await loadSnapshot(db);
    const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));

    let recipients: Set<string>;
    if (b.audience === 'all') {
      recipients = new Set(snap.volunteers.map((v) => v.id));
    } else {
      recipients = new Set();
      for (const a of snap.assignments) {
        const s = shiftById.get(a.shift_id);
        if (!s || !isActiveStatus(a.status) && a.status !== 'checked_in') continue;
        if (b.audience === 'zone' ? s.zone_id === b.zone_id : s.role_name === b.role_name) recipients.add(a.volunteer_id);
      }
      if (b.audience === 'zone') {
        const coord = snap.zones.find((z) => z.id === b.zone_id)?.coordinator_id;
        if (coord) recipients.add(coord);
      }
    }

    const ann = await insertAnnouncement({
      event_id: snap.event.id, audience: b.audience!, zone_id: b.audience === 'zone' ? b.zone_id! : null,
      role_name: b.audience === 'role' ? b.role_name! : null, title: b.title!.trim(), body: b.body!.trim(),
      urgent: !!b.urgent, created_by: b.created_by ?? null,
    }, db);
    await insertNotifications([...recipients].map((volunteer_id) => ({
      volunteer_id, kind: 'announcement' as const, title: (b.urgent ? 'URGENT: ' : '') + b.title!.trim(), body: b.body!.trim(),
    })), db);
    return ok({ announcement: ann, recipients: recipients.size });
  });
}
