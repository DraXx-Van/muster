// `npm run seed` wipes and recreates the demo event. Add `-- --assigned` to also pre-run the engine.
// Announce before running if others share the database.
import { config } from 'dotenv';
config({ path: '.env.local' });
import { serverClient } from '../db/server';
import { autoAssign } from '../engine';
import type { Task } from '../types';
import { buildSeed } from './data';

const TABLES = ['notifications', 'announcements', 'issues', 'tasks', 'assignments', 'shifts', 'zones', 'volunteers', 'events'];

async function main() {
  const db = serverClient();
  const withAssignments = process.argv.includes('--assigned');

  // event day = today (IST), clock starts at 08:45 so the first shifts are about to begin
  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  const seed = buildSeed({ date: today });
  const startClock = new Date(`${today}T08:45:00+05:30`);
  seed.event.clock_offset_minutes = Math.round((startClock.getTime() - Date.now()) / 60_000);

  for (const t of TABLES) {
    const { error } = await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`wipe ${t}: ${error.message}`);
  }

  const ins = async (table: string, rows: object[]) => {
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await db.from(table).insert(rows.slice(i, i + 100));
      if (error) throw new Error(`insert ${table}: ${error.message}`);
    }
  };

  await ins('events', [seed.event]);
  // zones reference coordinators and volunteers reference nothing zone-specific, so volunteers first, zones second
  await ins('volunteers', seed.volunteers);
  await ins('zones', seed.zones);
  await ins('shifts', seed.shifts);

  const zone = (name: string) => seed.zones.find((z) => z.name === name)!.id;
  const vols = seed.volunteers.filter((v) => v.role === 'volunteer');
  const tasks: Omit<Task, 'id' | 'created_at' | 'updated_at'>[] = [
    { event_id: seed.event.id, zone_id: zone('Entry Gate'), title: 'Set up barricades and queue lanes', description: null, status: 'in_progress', priority: 'high', assignee_id: null, created_by: null },
    { event_id: seed.event.id, zone_id: zone('Registration Desk'), title: 'Print 200 extra name badges', description: null, status: 'open', priority: 'medium', assignee_id: null, created_by: null },
    { event_id: seed.event.id, zone_id: zone('Main Stage'), title: 'Sound check with the emcee', description: null, status: 'open', priority: 'high', assignee_id: null, created_by: null },
    { event_id: seed.event.id, zone_id: zone('First Aid'), title: 'Restock first aid kits', description: null, status: 'resolved', priority: 'medium', assignee_id: null, created_by: null },
    { event_id: seed.event.id, zone_id: zone('Parking'), title: 'Mark VIP and two-wheeler bays', description: null, status: 'in_progress', priority: 'medium', assignee_id: null, created_by: null },
    { event_id: seed.event.id, zone_id: zone('Food Court'), title: 'Confirm water refill points', description: null, status: 'open', priority: 'low', assignee_id: null, created_by: null },
    { event_id: seed.event.id, zone_id: zone('Workshop Hall'), title: 'Arrange chairs for 120 people', description: null, status: 'open', priority: 'medium', assignee_id: vols[0].id, created_by: null },
    { event_id: seed.event.id, zone_id: zone('Info Desk'), title: 'Put up the venue map and schedule board', description: null, status: 'resolved', priority: 'low', assignee_id: null, created_by: null },
  ];
  await ins('tasks', tasks);

  let assigned = 0;
  if (withAssignments) {
    const plan = autoAssign({ volunteers: vols, shifts: seed.shifts, existing: [] });
    await ins('assignments', plan.assignments.map((a) => ({ ...a, status: 'assigned' })));
    assigned = plan.assignments.length;
  }

  console.log(`Seeded "${seed.event.name}" for ${today}: ${seed.zones.length} zones, ${seed.shifts.length} shifts, ${vols.length} volunteers, ${seed.volunteers.length - vols.length} staff, ${tasks.length} tasks, ${assigned} assignments.`);
  console.log(`Demo clock starts at 08:45 (offset ${seed.event.clock_offset_minutes} min).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
