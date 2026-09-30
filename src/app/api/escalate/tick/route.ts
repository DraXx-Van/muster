import { tickEscalations } from '@/lib/engine';
import { handle, ok } from '@/lib/api';
import { insertNotifications } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/** Called by coordinator pages every ~5 s. Escalates un-acknowledged issues past their deadline (REAL time). */
export async function POST() {
  return handle(async (db) => {
    const [issues, people, zones] = await Promise.all([
      db.from('issues').select('*').eq('status', 'open'),
      db.from('volunteers').select('*').neq('role', 'volunteer'),
      db.from('zones').select('*'),
    ]);
    if (issues.error) throw new Error(issues.error.message);
    const res = tickEscalations(issues.data ?? [], people.data ?? [], zones.data ?? [], new Date());
    for (const u of res.updates) {
      const { id, ...patch } = u;
      const { error } = await db.from('issues').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    }
    await insertNotifications(res.notifications, db);
    return ok({ escalated: res.updates.length });
  });
}
