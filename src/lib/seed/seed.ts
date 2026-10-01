// OPTIONAL dev tool: `npm run seed` creates a demo coordinator account and a big demo event (60 roster volunteers) so you can
// try the engine at scale. The app itself ships with NO data: real users create their own events from templates.
// It only ever touches events owned by the demo coordinator, never anyone else's. Add `-- --assigned` to pre-run the engine.
import { config } from 'dotenv';
config({ path: '.env.local' });
import { serverClient } from '../db/server';
import { autoAssign } from '../engine';
import { buildSeed } from './data';

const DEMO_EMAIL = 'demo.coordinator@muster.app';
const DEMO_PASSWORD = 'demo1234';

async function main() {
  const db = serverClient();
  const withAssignments = process.argv.includes('--assigned');

  // demo coordinator account (reuse if it exists)
  let userId: string | undefined;
  const found = await db.from('profiles').select('id').eq('email', DEMO_EMAIL).maybeSingle();
  if (found.data) userId = found.data.id;
  else {
    const { data, error } = await db.auth.admin.createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name: 'Demo Coordinator' } });
    if (error || !data.user) throw new Error(`create demo user: ${error?.message}`);
    userId = data.user.id;
    const { error: pErr } = await db.from('profiles').insert({ id: userId, full_name: 'Demo Coordinator', email: DEMO_EMAIL, account_type: 'coordinator' });
    if (pErr) throw new Error(`create demo profile: ${pErr.message}`);
  }

  // wipe the demo coordinator's previous demo events only
  const del = await db.from('events').delete().eq('owner_id', userId);
  if (del.error) throw new Error(`wipe: ${del.error.message}`);

  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  const seed = buildSeed({ date: today, ownerId: userId });
  const startClock = new Date(`${today}T08:45:00+05:30`);
  seed.event.clock_offset_minutes = Math.round((startClock.getTime() - Date.now()) / 60_000);
  seed.event.join_code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  // the organizer row is the demo coordinator's own login
  const organizer = seed.volunteers.find((v) => v.role === 'organizer')!;
  organizer.user_id = userId!;
  organizer.name = 'Demo Coordinator';
  organizer.email = DEMO_EMAIL;

  const ins = async (table: string, rows: object[]) => {
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await db.from(table).insert(rows.slice(i, i + 100));
      if (error) throw new Error(`insert ${table}: ${error.message}`);
    }
  };

  const { created_at: _c, ...eventRow } = seed.event;
  void _c;
  await ins('events', [eventRow]);
  await ins('volunteers', seed.volunteers);
  await ins('zones', seed.zones);
  await ins('shifts', seed.shifts);

  const vols = seed.volunteers.filter((v) => v.role === 'volunteer');
  let assigned = 0;
  if (withAssignments) {
    const plan = autoAssign({ volunteers: vols, shifts: seed.shifts, existing: [] });
    await ins('assignments', plan.assignments.map((a) => ({ ...a, event_id: seed.event.id, status: 'assigned' })));
    assigned = plan.assignments.length;
  }

  console.log(`Demo event "${seed.event.name}" created: ${seed.zones.length} zones, ${seed.shifts.length} shifts, ${vols.length} roster volunteers, ${assigned} assignments.`);
  console.log(`Sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}. Join code: ${seed.event.join_code}. Demo clock starts at 08:45.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
