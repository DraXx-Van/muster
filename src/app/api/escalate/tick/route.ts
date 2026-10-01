import { tickEscalations } from '@/lib/engine';
import { COORD, handle, ok, readJson } from '@/lib/api';
import { insertNotifications } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/** Called by coordinator pages every ~5 s. Escalates un-acknowledged issues past their deadline (REAL time). */
export async function POST(req: Request) {
  const { eventId } = await readJson<{ eventId?: string }>(req);
  return handle(req, { eventId, roles: COORD }, async ({ db }) => {
    const [issues, people, zones] = await Promise.all([
      db.from('issues').select('*').eq('event_id', eventId!).eq('status', 'open'),
      db.from('volunteers').select('*').eq('event_id', eventId!).neq('role', 'volunteer'),
      db.from('zones').select('*').eq('event_id', eventId!),
    ]);
    if (issues.error) throw new Error(issues.error.message);
    const res = tickEscalations(issues.data ?? [], people.data ?? [], zones.data ?? [], new Date());
    for (const u of res.updates) {
      const { id, ...patch } = u;
      const { error } = await db.from('issues').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    }
    await insertNotifications(eventId!, res.notifications, db);
    return ok({ escalated: res.updates.length });
  });
}
