// SHARED CONTRACT. Everyone codes against these types. Change only with team agreement (tell P4).
// Dates are ISO strings in the DB / API layer. Engine functions receive `now: Date` explicitly.

export type PersonRole = 'volunteer' | 'coordinator' | 'organizer';

export const SKILLS = [
  'First Aid', 'Crowd Control', 'Registration', 'AV/Tech', 'Parking/Traffic',
  'Hospitality', 'Security', 'Logistics', 'Photography', 'Multilingual',
] as const;
export type Skill = (typeof SKILLS)[number];

export interface EventRow {
  id: string;
  name: string;
  venue: string | null;
  starts_at: string;
  ends_at: string;
  clock_offset_minutes: number;
}

export interface AvailabilityWindow { start: string; end: string }

export interface Volunteer {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: PersonRole;
  skills: string[];
  availability: AvailabilityWindow[];
  preferred_zone_ids: string[];
  max_hours: number;
  reliability: number; // 0..1
  verified: boolean;
}

export interface Zone {
  id: string;
  event_id: string;
  name: string;
  color: string;
  map_x: number; map_y: number; map_w: number; map_h: number;
  coordinator_id: string | null;
}

export interface Shift {
  id: string;
  event_id: string;
  zone_id: string;
  role_name: string;
  required_skills: string[];
  starts_at: string;
  ends_at: string;
  headcount: number;
}

export type AssignmentStatus =
  'assigned' | 'confirmed' | 'checked_in' | 'completed' | 'no_show' | 'dropped';

export interface Assignment {
  id: string;
  shift_id: string;
  volunteer_id: string;
  status: AssignmentStatus;
  score: number | null;
  reason: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

export type TaskStatus = 'open' | 'in_progress' | 'resolved';
export interface Task {
  id: string;
  event_id: string;
  zone_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type IssueCategory = 'medical' | 'crowd_surge' | 'missing_equipment' | 'security' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface Issue {
  id: string;
  event_id: string;
  zone_id: string | null;
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  status: 'open' | 'acknowledged' | 'resolved';
  raised_by: string | null;
  assigned_to: string | null;
  escalation_level: number; // 0 zone coordinator, 1 head coordinator, 2 organizer
  ack_deadline: string | null; // REAL time
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  event_id: string;
  audience: 'all' | 'zone' | 'role';
  zone_id: string | null;
  role_name: string | null;
  title: string;
  body: string;
  urgent: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  volunteer_id: string;
  kind: 'announcement' | 'assignment' | 'issue' | 'escalation';
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// ENGINE CONTRACT (P1 implements in src/lib/engine, P2/P3/P4 consume).
// Until the engine is ready, use mocks in src/lib/mock/ that return these shapes.
// ---------------------------------------------------------------------------

export interface NewAssignment {
  shift_id: string;
  volunteer_id: string;
  score: number;
  reason: string; // e.g. "Has First Aid; prefers this zone; 2.0h so far (below average)"
}

export interface Gap {
  shift_id: string;
  seatsMissing: number;
  reason: string; // e.g. "No First Aid certified volunteer free 12:00-15:00"
}

export interface AssignStats {
  coveragePct: number;          // filled seats / required seats * 100
  filledSeats: number;
  requiredSeats: number;
  hoursStdDev: number;          // fairness: lower is better
  avgHours: number;
  computeMs: number;
}

export interface AutoAssignInput {
  volunteers: Volunteer[];      // role === 'volunteer' only
  shifts: Shift[];
  existing: Assignment[];       // keep active ones (assigned/confirmed/checked_in/completed)
}
export interface AutoAssignResult {
  assignments: NewAssignment[];
  gaps: Gap[];
  stats: AssignStats;
}
// autoAssign(input: AutoAssignInput): AutoAssignResult
// naiveAssign(input: AutoAssignInput): AutoAssignResult   // benchmark baseline

export interface ReplacementSuggestion {
  volunteer_id: string;
  score: number;
  reason: string;
}
// suggestReplacements(input: AutoAssignInput, droppedAssignment: Assignment, now: Date): ReplacementSuggestion[]

export type CoverageStatus = 'covered' | 'partial' | 'gap';
export interface CoverageCell {
  zone_id: string;
  shift_id: string;
  required: number;
  present: number;      // assigned (planning) or checked_in (live), depending on mode
  status: CoverageStatus;
}
// computeCoverage(shifts: Shift[], assignments: Assignment[], mode: 'planned' | 'live', now: Date): CoverageCell[]

export interface MoveSuggestion {
  volunteer_id: string;
  from_zone_id: string;
  to_zone_id: string;
  to_shift_id: string;
  reason: string; // "Priya (Registration, +2 over) -> Parking (-1). Has Parking/Traffic."
}
// suggestMoves(cells: CoverageCell[], volunteers: Volunteer[], shifts: Shift[], assignments: Assignment[], now: Date): MoveSuggestion[]

export interface EscalationResult {
  updates: (Partial<Issue> & { id: string })[];                 // issue rows to write back
  notifications: Omit<Notification, 'id' | 'read' | 'created_at'>[]; // to insert for the new assignees
}
// tickEscalations(issues: Issue[], coordinators: Volunteer[], zones: Zone[], nowReal: Date): EscalationResult
