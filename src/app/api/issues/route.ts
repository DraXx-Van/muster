import { routeIssue } from '@/lib/engine';
import { handle, fail, loadSnapshot, ok } from '@/lib/api';
import { insertNotifications } from '@/lib/db/queries';
import type { Issue, IssueCategory, IssueSeverity } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Raise an issue: auto-routed to the zone coordinator (medical also pages First Aid) with an ack deadline. */
export async function POST(req: Request) {
  const b = (await req.json()) as { category?: IssueCategory; severity?: IssueSeverity; zone_id?: string | null; description?: string; raised_by?: string | null };
  if (!b.category || !b.severity || !b.description?.trim()) return fail('category, severity and description are required');
  return handle(async (db) => {
    const { snap } = await loadSnapshot(db);
    const route = routeIssue({ category: b.category!, severity: b.severity!, zone_id: b.zone_id ?? null, description: b.description! }, snap.volunteers, snap.zones, new Date());
    const { data, error } = await db.from('issues').insert({
      event_id: snap.event.id, zone_id: b.zone_id ?? null, category: b.category, severity: b.severity, description: b.description!.trim(),
      raised_by: b.raised_by ?? null, assigned_to: route.assigned_to, escalation_level: 0, ack_deadline: route.ack_deadline,
    }).select().single();
    if (error) throw new Error(error.message);
    await insertNotifications(route.notifications, db);
    return ok({ issue: data as Issue });
  });
}
