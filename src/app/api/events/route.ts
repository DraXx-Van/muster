import { handle, HttpError, ok, readJson } from '@/lib/api';
import { getProfile } from '@/lib/db/queries';
import { TEMPLATES, buildFromTemplate, makeJoinCode, type CrewSize } from '@/lib/templates';

export const dynamic = 'force-dynamic';

interface Body {
  name?: string; venue?: string; description?: string;
  date?: string; startTime?: string; endTime?: string;   // IST, e.g. 2026-10-03, 09:00, 21:00
  templateId?: string; crew?: CrewSize; zones?: string[]; blockHours?: number;
}

/** Creates an event from a template: event, organizer row, zones, shifts and starter tasks. */
export async function POST(req: Request) {
  const b = await readJson<Body>(req);
  return handle(req, {}, async ({ db, user }) => {
    const profile = await getProfile(user.id, db);
    if (!profile || profile.account_type !== 'coordinator') throw new HttpError(403, 'Only coordinator accounts can create events.');

    const name = b.name?.trim() ?? '';
    if (name.length < 3) throw new HttpError(400, 'Give the event a name (3+ characters).');
    if (!b.date || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) throw new HttpError(400, 'Pick the event date.');
    if (!b.startTime || !b.endTime) throw new HttpError(400, 'Set the start and end time.');
    const template = TEMPLATES.find((t) => t.id === b.templateId);
    if (!template) throw new HttpError(400, 'Pick a template.');

    const start = new Date(`${b.date}T${b.startTime}:00+05:30`);
    let end = new Date(`${b.date}T${b.endTime}:00+05:30`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new HttpError(400, 'Those times are not valid.');
    if (end <= start) end = new Date(end.getTime() + 24 * 3_600_000); // ends after midnight
    if (end.getTime() - start.getTime() > 72 * 3_600_000) throw new HttpError(400, 'An event can run for at most 72 hours.');

    const plan = buildFromTemplate(template, { startISO: start.toISOString(), endISO: end.toISOString(), crew: b.crew ?? 'medium', zones: b.zones, blockHours: b.blockHours });
    if (plan.seats > 1500) throw new HttpError(400, 'That is too many seats. Pick a smaller crew size or fewer zones.');

    // unique join code
    let event: { id: string } | null = null;
    for (let i = 0; i < 6 && !event; i++) {
      const { data, error } = await db.from('events').insert({
        owner_id: user.id, name, venue: b.venue?.trim() || null, description: b.description?.trim() || null,
        starts_at: start.toISOString(), ends_at: end.toISOString(), join_code: makeJoinCode(), template_id: template.id,
      }).select('id').single();
      if (!error) event = data;
      else if (!/duplicate|unique/i.test(error.message)) throw new HttpError(500, error.message);
    }
    if (!event) throw new HttpError(500, 'Could not allocate a join code. Try again.');

    const fail = async (msg: string) => { await db.from('events').delete().eq('id', event!.id); throw new HttpError(500, msg); };

    const { data: org, error: oErr } = await db.from('volunteers').insert({
      event_id: event.id, user_id: user.id, name: profile.full_name, email: profile.email, phone: profile.phone, avatar_url: profile.avatar_url,
      role: 'organizer', skills: [], availability: [{ start: start.toISOString(), end: end.toISOString() }], max_hours: 12, reliability: 1, verified: true,
    }).select('id').single();
    if (oErr || !org) return fail(oErr?.message ?? 'Could not add the organizer.');

    let zoneIds = new Map<string, string>();
    if (plan.zones.length) {
      const { data: zs, error: zErr } = await db.from('zones').insert(plan.zones.map((z) => ({ ...z, event_id: event!.id, coordinator_id: org.id }))).select('id, name');
      if (zErr) return fail(zErr.message);
      zoneIds = new Map((zs ?? []).map((z: { id: string; name: string }) => [z.name, z.id]));
      const { error: sErr } = await db.from('shifts').insert(plan.shifts.map((s) => ({
        event_id: event!.id, zone_id: zoneIds.get(s.zone), role_name: s.role_name, required_skills: s.required_skills,
        starts_at: s.starts_at, ends_at: s.ends_at, headcount: s.headcount,
      })));
      if (sErr) return fail(sErr.message);
      if (plan.tasks.length) {
        const { error: tErr } = await db.from('tasks').insert(plan.tasks.map((t) => ({ event_id: event!.id, zone_id: zoneIds.get(t.zone), title: t.title, priority: t.priority, created_by: org.id })));
        if (tErr) return fail(tErr.message);
      }
    }
    return ok({ eventId: event.id, zones: plan.zones.length, shifts: plan.shifts.length, seats: plan.seats });
  });
}
