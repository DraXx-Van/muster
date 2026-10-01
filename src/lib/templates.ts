// Predefined event templates + the pure generator that turns one into zones, shifts and starter tasks.
// No DB, no clock. Used by the "create event" wizard (preview) and by POST /api/events (real insert).
import { SKILLS } from './types';

export interface TemplateZone {
  name: string;
  color: string;
  role: string;        // role name of the shift generated for this zone
  skills: string[];    // required skills (subset of SKILLS)
  headcount: number;   // seats per time block at "medium" crew size
}
export interface TemplateTask { zone: string; title: string; priority: 'low' | 'medium' | 'high' }
export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  blockHours: number;
  defaultStart: string; // HH:mm
  defaultEnd: string;
  zones: TemplateZone[];
  tasks: TemplateTask[];
}

export const TEMPLATES: EventTemplate[] = [
  {
    id: 'college-fest',
    name: 'College fest',
    description: 'Gates, registration, stage, first aid, food and workshops. A full-day campus festival.',
    blockHours: 3, defaultStart: '09:00', defaultEnd: '21:00',
    zones: [
      { name: 'Entry Gate', color: '#6366f1', role: 'Gate Steward', skills: ['Crowd Control'], headcount: 5 },
      { name: 'Registration Desk', color: '#0ea5e9', role: 'Registration Desk', skills: ['Registration'], headcount: 4 },
      { name: 'Main Stage', color: '#a855f7', role: 'Stage Crew', skills: ['AV/Tech'], headcount: 3 },
      { name: 'First Aid', color: '#ef4444', role: 'First Aid Responder', skills: ['First Aid'], headcount: 2 },
      { name: 'Info Desk', color: '#14b8a6', role: 'Info Desk Host', skills: ['Multilingual'], headcount: 2 },
      { name: 'Workshop Hall', color: '#f59e0b', role: 'Workshop Assistant', skills: ['Logistics'], headcount: 3 },
      { name: 'Parking', color: '#64748b', role: 'Traffic Marshal', skills: ['Parking/Traffic'], headcount: 4 },
      { name: 'Food Court', color: '#22c55e', role: 'Food Court Host', skills: ['Hospitality'], headcount: 4 },
    ],
    tasks: [
      { zone: 'Entry Gate', title: 'Set up barricades and queue lanes', priority: 'high' },
      { zone: 'Registration Desk', title: 'Print and sort name badges', priority: 'medium' },
      { zone: 'Main Stage', title: 'Sound check with the emcee', priority: 'high' },
      { zone: 'First Aid', title: 'Restock first aid kits', priority: 'medium' },
      { zone: 'Parking', title: 'Mark VIP and two-wheeler bays', priority: 'medium' },
      { zone: 'Food Court', title: 'Confirm water refill points', priority: 'low' },
    ],
  },
  {
    id: 'marathon',
    name: 'Marathon or fun run',
    description: 'Start line, bib pickup, hydration stations, route marshals and a medical tent.',
    blockHours: 2, defaultStart: '05:00', defaultEnd: '13:00',
    zones: [
      { name: 'Start and Finish Line', color: '#6366f1', role: 'Line Marshal', skills: ['Crowd Control'], headcount: 4 },
      { name: 'Bib Pickup', color: '#0ea5e9', role: 'Bib Pickup Desk', skills: ['Registration'], headcount: 4 },
      { name: 'Hydration Station A', color: '#14b8a6', role: 'Hydration Volunteer', skills: ['Hospitality'], headcount: 3 },
      { name: 'Hydration Station B', color: '#22c55e', role: 'Hydration Volunteer', skills: ['Hospitality'], headcount: 3 },
      { name: 'Medical Tent', color: '#ef4444', role: 'Race Medic', skills: ['First Aid'], headcount: 2 },
      { name: 'Route Marshals', color: '#f59e0b', role: 'Route Marshal', skills: ['Crowd Control'], headcount: 5 },
      { name: 'Baggage Check', color: '#a855f7', role: 'Baggage Handler', skills: ['Logistics'], headcount: 2 },
      { name: 'Parking and Shuttle', color: '#64748b', role: 'Traffic Marshal', skills: ['Parking/Traffic'], headcount: 3 },
    ],
    tasks: [
      { zone: 'Start and Finish Line', title: 'Mount the timing mats and finish arch', priority: 'high' },
      { zone: 'Hydration Station A', title: 'Set up cups, water and electrolytes', priority: 'high' },
      { zone: 'Medical Tent', title: 'Check stretchers and AED', priority: 'high' },
      { zone: 'Route Marshals', title: 'Walk the route and place cones', priority: 'medium' },
    ],
  },
  {
    id: 'conference',
    name: 'Conference or summit',
    description: 'Registration, session halls, speaker lounge, help desk and catering over a single day.',
    blockHours: 3, defaultStart: '09:00', defaultEnd: '18:00',
    zones: [
      { name: 'Registration', color: '#0ea5e9', role: 'Registration Desk', skills: ['Registration'], headcount: 3 },
      { name: 'Main Hall', color: '#a855f7', role: 'Session Host', skills: ['Hospitality'], headcount: 2 },
      { name: 'Breakout Rooms', color: '#f59e0b', role: 'Room Monitor', skills: ['Logistics'], headcount: 3 },
      { name: 'Speaker Lounge', color: '#14b8a6', role: 'Speaker Host', skills: ['Hospitality'], headcount: 2 },
      { name: 'Help Desk', color: '#6366f1', role: 'Attendee Support', skills: ['Multilingual'], headcount: 2 },
      { name: 'Catering', color: '#22c55e', role: 'Catering Support', skills: ['Hospitality'], headcount: 3 },
      { name: 'AV Booth', color: '#ec4899', role: 'AV Technician', skills: ['AV/Tech'], headcount: 2 },
    ],
    tasks: [
      { zone: 'Registration', title: 'Prepare lanyards and welcome kits', priority: 'high' },
      { zone: 'AV Booth', title: 'Test slides and microphones in every room', priority: 'high' },
      { zone: 'Speaker Lounge', title: 'Stock the lounge and confirm speaker arrivals', priority: 'medium' },
    ],
  },
  {
    id: 'music-festival',
    name: 'Music festival',
    description: 'Gates, barrier, stages, medical, food, merch and parking for an evening festival.',
    blockHours: 4, defaultStart: '15:00', defaultEnd: '23:00',
    zones: [
      { name: 'Main Gate', color: '#6366f1', role: 'Gate Steward', skills: ['Crowd Control'], headcount: 6 },
      { name: 'Security Check', color: '#64748b', role: 'Bag Check', skills: ['Security'], headcount: 4 },
      { name: 'Main Stage', color: '#a855f7', role: 'Stage Crew', skills: ['AV/Tech'], headcount: 4 },
      { name: 'Crowd Barrier', color: '#f59e0b', role: 'Barrier Marshal', skills: ['Crowd Control'], headcount: 5 },
      { name: 'Medical', color: '#ef4444', role: 'Festival Medic', skills: ['First Aid'], headcount: 3 },
      { name: 'Food and Drink', color: '#22c55e', role: 'Food Stall Helper', skills: ['Hospitality'], headcount: 5 },
      { name: 'Merchandise', color: '#14b8a6', role: 'Merch Seller', skills: ['Registration'], headcount: 2 },
      { name: 'Parking', color: '#0ea5e9', role: 'Traffic Marshal', skills: ['Parking/Traffic'], headcount: 4 },
    ],
    tasks: [
      { zone: 'Main Gate', title: 'Set up wristband check lanes', priority: 'high' },
      { zone: 'Main Stage', title: 'Line check with the headliner crew', priority: 'high' },
      { zone: 'Medical', title: 'Set up triage area and radios', priority: 'high' },
      { zone: 'Parking', title: 'Light and mark the parking field', priority: 'medium' },
    ],
  },
  {
    id: 'blank',
    name: 'Blank event',
    description: 'Start from scratch. Add your own zones, roles and shifts in Event setup.',
    blockHours: 3, defaultStart: '09:00', defaultEnd: '18:00',
    zones: [],
    tasks: [],
  },
];

export type CrewSize = 'test' | 'small' | 'medium' | 'large';
export const CREW_SIZES: { id: CrewSize; label: string; hint: string; scale: number }[] = [
  { id: 'test', label: 'Testing', hint: '1 seat per shift, fine for 5 volunteers', scale: 0 },
  { id: 'small', label: 'Small', hint: 'About 40% of the typical crew', scale: 0.4 },
  { id: 'medium', label: 'Medium', hint: 'The typical crew for this event', scale: 1 },
  { id: 'large', label: 'Large', hint: 'About 60% more people', scale: 1.6 },
];

export const seatsFor = (base: number, crew: CrewSize): number => {
  const c = CREW_SIZES.find((x) => x.id === crew) ?? CREW_SIZES[2];
  return c.scale === 0 ? 1 : Math.max(1, Math.round(base * c.scale));
};

/** Evenly sized rectangles on the 800 x 480 venue map. */
export function autoLayout(n: number): { map_x: number; map_y: number; map_w: number; map_h: number }[] {
  if (n <= 0) return [];
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const pad = 20, gap = 16;
  const w = Math.floor((800 - 2 * pad - (cols - 1) * gap) / cols);
  const h = Math.floor((480 - 2 * pad - (rows - 1) * gap) / rows);
  return Array.from({ length: n }, (_, i) => ({
    map_x: pad + (i % cols) * (w + gap),
    map_y: pad + Math.floor(i / cols) * (h + gap),
    map_w: w,
    map_h: h,
  }));
}

/** Split [start, end) into consecutive blocks of `blockHours` (the last one may be shorter). */
export function planBlocks(startISO: string, endISO: string, blockHours: number): { start: string; end: string }[] {
  const start = Date.parse(startISO);
  const end = Date.parse(endISO);
  const step = Math.max(0.5, blockHours) * 3_600_000;
  const out: { start: string; end: string }[] = [];
  for (let t = start; t < end; t += step) {
    out.push({ start: new Date(t).toISOString(), end: new Date(Math.min(t + step, end)).toISOString() });
  }
  return out;
}

export interface GeneratedPlan {
  zones: { name: string; color: string; map_x: number; map_y: number; map_w: number; map_h: number }[];
  shifts: { zone: string; role_name: string; required_skills: string[]; starts_at: string; ends_at: string; headcount: number }[];
  tasks: TemplateTask[];
  seats: number;
}

export function buildFromTemplate(
  t: EventTemplate,
  opts: { startISO: string; endISO: string; crew: CrewSize; zones?: string[]; blockHours?: number },
): GeneratedPlan {
  const picked = t.zones.filter((z) => !opts.zones || opts.zones.includes(z.name));
  const layout = autoLayout(picked.length);
  const blocks = planBlocks(opts.startISO, opts.endISO, opts.blockHours ?? t.blockHours);
  const zones = picked.map((z, i) => ({ name: z.name, color: z.color, ...layout[i] }));
  const shifts = picked.flatMap((z) =>
    blocks.map((b) => ({
      zone: z.name, role_name: z.role, required_skills: z.skills.filter((s) => (SKILLS as readonly string[]).includes(s)),
      starts_at: b.start, ends_at: b.end, headcount: seatsFor(z.headcount, opts.crew),
    })),
  );
  const names = new Set(picked.map((z) => z.name));
  return { zones, shifts, tasks: t.tasks.filter((x) => names.has(x.zone)), seats: shifts.reduce((n, s) => n + s.headcount, 0) };
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function makeJoinCode(rand: () => number = Math.random): string {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('');
}
