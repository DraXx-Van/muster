// Issue routing and escalation. `nowReal` is REAL time (not the demo clock): deadlines are wall-clock seconds.
import type { EscalationResult, Issue, IssueSeverity, Volunteer, Zone } from '../types';
import { ms } from './time';

/** Acknowledge window per severity, in seconds. Compressed for the demo (production would use minutes). */
export const ACK_SECONDS: Record<IssueSeverity, number> = { critical: 30, high: 60, medium: 120, low: 300 };
export const MAX_ESCALATION_LEVEL = 2; // 0 zone coordinator, 1 head coordinator, 2 organizer

type NewIssue = Pick<Issue, 'category' | 'severity' | 'zone_id' | 'description'> & { id?: string };
type Note = EscalationResult['notifications'][number];

const deadline = (nowReal: Date, sev: IssueSeverity) => new Date(nowReal.getTime() + ACK_SECONDS[sev] * 1000).toISOString();

/** Head coordinator = first coordinator in list order who is not `exceptId`. */
function headCoordinator(coordinators: Volunteer[], exceptId: string | null): Volunteer | undefined {
  const all = coordinators.filter((c) => c.role === 'coordinator');
  return all.find((c) => c.id !== exceptId) ?? all[0];
}
const organizer = (people: Volunteer[]) => people.find((p) => p.role === 'organizer');
/** The zone that handles medical cases, found by name so any event template works. */
const medicalZone = (zones: Zone[]) => zones.find((z) => /first aid|medic/i.test(z.name));

/** Initial routing of a new issue: zone coordinator owns it; medical also pages the First Aid coordinator. */
export function routeIssue(
  issue: NewIssue, people: Volunteer[], zones: Zone[], nowReal: Date,
): { assigned_to: string | null; escalation_level: number; ack_deadline: string; notifications: Note[] } {
  const zone = zones.find((z) => z.id === issue.zone_id);
  // zone coordinator, else a head coordinator, else the organizer (an event may have only one coordinator)
  const owner = people.find((p) => p.id === zone?.coordinator_id) ?? headCoordinator(people, null) ?? organizer(people);
  const notifications: Note[] = [];
  const label = `${issue.severity.toUpperCase()} ${issue.category.replace('_', ' ')}${zone ? ` at ${zone.name}` : ''}`;
  if (owner) notifications.push({ volunteer_id: owner.id, kind: 'issue', title: label, body: issue.description });
  if (issue.category === 'medical') {
    const medic = people.find((p) => p.id === medicalZone(zones)?.coordinator_id);
    if (medic && medic.id !== owner?.id) notifications.push({ volunteer_id: medic.id, kind: 'issue', title: label, body: issue.description });
  }
  return { assigned_to: owner?.id ?? null, escalation_level: 0, ack_deadline: deadline(nowReal, issue.severity), notifications };
}

/** Escalate every open, un-acknowledged issue whose deadline has passed by one level. */
export function tickEscalations(issues: Issue[], people: Volunteer[], zones: Zone[], nowReal: Date): EscalationResult {
  void zones;
  const updates: EscalationResult['updates'] = [];
  const notifications: Note[] = [];
  for (const i of issues) {
    if (i.status !== 'open' || !i.ack_deadline || ms(i.ack_deadline) > nowReal.getTime()) continue;
    if (i.escalation_level >= MAX_ESCALATION_LEVEL) continue;
    const level = i.escalation_level + 1;
    const next = level === 1
      ? headCoordinator(people, i.assigned_to) ?? organizer(people)
      : organizer(people) ?? headCoordinator(people, i.assigned_to);
    updates.push({ id: i.id, escalation_level: level, assigned_to: next?.id ?? i.assigned_to, ack_deadline: deadline(nowReal, i.severity) });
    if (next) {
      notifications.push({
        volunteer_id: next.id, kind: 'escalation',
        title: `ESCALATED (level ${level}): ${i.severity} ${i.category.replace('_', ' ')}`,
        body: `Not acknowledged in time. ${i.description}`,
      });
    }
  }
  return { updates, notifications };
}
