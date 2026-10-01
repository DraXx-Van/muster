import { routeIssue } from '@/lib/engine';
import { handle, HttpError, loadSnapshot, MEMBER, ok, readJson } from '@/lib/api';
import { insertNotifications } from '@/lib/db/queries';
import type { Issue, IssueCategory, IssueSeverity } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Raise an issue: auto-routed to the zone coordinator (medical also pages First Aid) with an ack deadline. */
export async function POST(req: Request) {
  const b = await readJson<{ eventId?: string; category?: IssueCategory; severity?: IssueSeverity; zone_id?: string | null; description?: string }>(req);
  return handle(req, { eventId: b.eventId, roles: MEMBER }, async ({ db, user }) => {
    if (!b.category || !b.severity || !b.description?.trim()) throw new HttpError(400, 'category, severity and description are required');
    const { snap } = await loadSnapshot(db, b.eventId!);
    const me = snap.volunteers.find((v) => v.user_id === user.id);
    const route = routeIssue({ category: b.category, severity: b.severity, zone_id: b.zone_id ?? null, description: b.description }, snap.volunteers, snap.zones, new Date());
    const { data, error } = await db.from('issues').insert({
      event_id: b.eventId, zone_id: b.zone_id ?? null, category: b.category, severity: b.severity, description: b.description.trim(),
      raised_by: me?.id ?? null, assigned_to: route.assigned_to, escalation_level: 0, ack_deadline: route.ack_deadline,
    }).select().single();
    if (error) throw new Error(error.message);
    await insertNotifications(b.eventId!, route.notifications, db);
    return ok({ issue: data as Issue });
  });
}
