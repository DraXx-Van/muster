import { isActiveStatus, routeIssue, suggestReplacements } from '@/lib/engine';
import { handle, loadSnapshot, ok } from '@/lib/api';
import { insertNotifications, setAssignmentStatus } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

const MEDICAL_STORIES = [
  'Attendee fainted near the stage barricade, needs a first responder',
  'Volunteer reports a heat-exhaustion case at the gate queue',
  'Minor injury in the crowd, bleeding hand, needs a first aider now',
];

/** Chaos button: drops 3 upcoming volunteers (one of them a First Aid responder) and raises a medical issue. */
export async function POST() {
  return handle(async (db) => {
    const { snap, now } = await loadSnapshot(db);
    const volunteers = snap.volunteers.filter((v) => v.role === 'volunteer');
    const shiftById = new Map(snap.shifts.map((s) => [s.id, s]));
    const volById = new Map(snap.volunteers.map((v) => [v.id, v]));
    const upcoming = snap.assignments.filter((a) => {
      const s = shiftById.get(a.shift_id);
      return s && isActiveStatus(a.status) && a.status !== 'completed' && new Date(s.ends_at) > now;
    });

    // 1. A First Aid responder, from the earliest FA shift that still has someone who could replace them.
    const faShifts = snap.shifts.filter((s) => s.required_skills.includes('First Aid') && new Date(s.ends_at) > now);
    faShifts.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    let firstAid = null as (typeof upcoming)[number] | null;
    for (const s of faShifts) {
      for (const a of upcoming.filter((x) => x.shift_id === s.id)) {
        const reps = suggestReplacements({ volunteers, shifts: snap.shifts, existing: snap.assignments }, a, now);
        if (reps.length) { firstAid = a; break; }
      }
      if (firstAid) break;
    }

    // 2. Two more random volunteers elsewhere.
    const pool = upcoming.filter((a) => a.id !== firstAid?.id && a.volunteer_id !== firstAid?.volunteer_id);
    const picks = [...pool].sort(() => Math.random() - 0.5);
    const chosen = [firstAid, ...picks].filter(Boolean).slice(0, 3) as typeof upcoming;
    const seen = new Set<string>();
    const dropped = chosen.filter((a) => (seen.has(a.volunteer_id) ? false : (seen.add(a.volunteer_id), true)));

    for (const a of dropped) await setAssignmentStatus(a.id, 'dropped', now, db);

    // 3. A medical issue in the First Aid zone, routed like any other issue.
    const faZone = snap.zones.find((z) => z.name === 'First Aid') ?? snap.zones[0];
    const description = MEDICAL_STORIES[Math.floor(Math.random() * MEDICAL_STORIES.length)];
    const route = routeIssue({ category: 'medical', severity: 'high', zone_id: faZone.id, description }, snap.volunteers, snap.zones, new Date());
    const { data: issue, error } = await db.from('issues').insert({
      event_id: snap.event.id, zone_id: faZone.id, category: 'medical', severity: 'high', description,
      assigned_to: route.assigned_to, escalation_level: 0, ack_deadline: route.ack_deadline,
    }).select().single();
    if (error) throw new Error(error.message);
    await insertNotifications(route.notifications, db);

    return ok({
      dropped: dropped.map((a) => ({ assignment_id: a.id, volunteer: volById.get(a.volunteer_id)?.name, shift_id: a.shift_id })),
      issue,
    });
  });
}
