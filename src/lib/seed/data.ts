// Pure, deterministic seed data (no DB, no Date.now). Used by the seed script AND by engine tests.
// Event day is in IST (+05:30). Deliberately tight: First Aid (4 people) and AV/Tech (6 people) are scarce.
import type { EventRow, Shift, Volunteer, Zone } from '../types';

export interface SeedData {
  event: EventRow;
  zones: Zone[];
  volunteers: Volunteer[]; // includes coordinators + organizer (role !== 'volunteer')
  shifts: Shift[];
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = [
  'Aarav Sharma', 'Priya Nair', 'Rohan Mehta', 'Ananya Iyer', 'Vikram Singh', 'Sneha Patil',
  'Arjun Reddy', 'Kavya Menon', 'Siddharth Joshi', 'Isha Gupta', 'Karan Malhotra', 'Diya Shah',
  'Aditya Verma', 'Meera Desai', 'Rahul Kapoor', 'Nisha Pillai', 'Varun Bhatt', 'Tanvi Kulkarni',
  'Harsh Agarwal', 'Pooja Rao', 'Yash Thakur', 'Riya Chatterjee', 'Manish Yadav', 'Shruti Naik',
  'Nikhil Jain', 'Aisha Khan', 'Devansh Tiwari', 'Simran Kaur', 'Omkar Jadhav', 'Neha Bansal',
  'Kabir Sethi', 'Anjali Mishra', 'Tushar Pandey', 'Mansi Dalal', 'Rishabh Saxena', 'Jhanvi Trivedi',
  'Pranav Kulkarni', 'Sakshi Gokhale', 'Ishaan Bose', 'Kriti Sinha', 'Dev Patel', 'Ritika Ghosh',
  'Abhishek Nambiar', 'Swara Bhosale', 'Gaurav Chopra', 'Trisha Dutta', 'Mohit Rawat', 'Aarti Deshmukh',
  'Sameer Qureshi', 'Bhavna Solanki', 'Rajat Khanna', 'Payal Menon', 'Uday Shetty', 'Lavanya Krishnan',
  'Zoya Ansari', 'Chirag Vora', 'Madhuri Kamat', 'Aniket Salunkhe', 'Fatima Sheikh', 'Jay Parekh',
];

const STAFF = [
  { name: 'Meera Kulkarni', role: 'coordinator' as const, skills: ['Crowd Control', 'Logistics'] }, // head coordinator (first in list)
  { name: 'Rohit Deshpande', role: 'coordinator' as const, skills: ['AV/Tech', 'Hospitality'] },
  { name: 'Dr. Sana Fernandes', role: 'coordinator' as const, skills: ['First Aid', 'Hospitality'] },
  { name: 'Anil Kapoor', role: 'organizer' as const, skills: ['Logistics'] },
];

// zone name, color, map rect, role, required skills, headcount per 3h block (09-12, 12-15, 15-18, 18-21), coordinator index
const ZONE_PLAN = [
  { name: 'Entry Gate', color: '#6366f1', rect: [20, 20, 170, 110], role: 'Gate Steward', skills: ['Crowd Control'], hc: [5, 5, 5, 4], coord: 0 },
  { name: 'Registration Desk', color: '#0ea5e9', rect: [210, 20, 170, 110], role: 'Registration Desk', skills: ['Registration'], hc: [4, 5, 4, 3], coord: 0 },
  { name: 'Main Stage', color: '#a855f7', rect: [400, 20, 380, 200], role: 'Stage Crew', skills: ['AV/Tech'], hc: [3, 3, 3, 3], coord: 1 },
  { name: 'First Aid', color: '#ef4444', rect: [20, 150, 170, 110], role: 'First Aid Responder', skills: ['First Aid'], hc: [1, 2, 2, 1], coord: 2 },
  { name: 'Info Desk', color: '#14b8a6', rect: [210, 150, 170, 110], role: 'Info Desk Host', skills: ['Multilingual'], hc: [2, 3, 2, 2], coord: 1 },
  { name: 'Workshop Hall', color: '#f59e0b', rect: [400, 240, 380, 110], role: 'Workshop Assistant', skills: ['Logistics'], hc: [3, 3, 3, 3], coord: 1 },
  { name: 'Parking', color: '#64748b', rect: [20, 280, 360, 150], role: 'Traffic Marshal', skills: ['Parking/Traffic'], hc: [4, 4, 4, 3], coord: 0 },
  { name: 'Food Court', color: '#22c55e', rect: [400, 370, 380, 100], role: 'Food Court Host', skills: ['Hospitality'], hc: [4, 4, 4, 3], coord: 2 },
] as const;

const BLOCKS: [string, string][] = [['09', '12'], ['12', '15'], ['15', '18'], ['18', '21']];

// primary skill -> how many volunteers have it as their main skill (sums to 60)
const PRIMARY: [string, number][] = [
  ['First Aid', 4], ['AV/Tech', 6], ['Crowd Control', 10], ['Registration', 9],
  ['Parking/Traffic', 9], ['Hospitality', 9], ['Multilingual', 6], ['Logistics', 7],
];
const SKILL_ZONE: Record<string, string> = {
  'First Aid': 'First Aid', 'AV/Tech': 'Main Stage', 'Crowd Control': 'Entry Gate',
  Registration: 'Registration Desk', 'Parking/Traffic': 'Parking', Hospitality: 'Food Court',
  Multilingual: 'Info Desk', Logistics: 'Workshop Hall',
};
// extras never include the scarce skills, so First Aid stays at exactly 4 and AV/Tech at exactly 6
const EXTRA_SKILLS = ['Crowd Control', 'Registration', 'Parking/Traffic', 'Hospitality', 'Multilingual', 'Logistics', 'Security', 'Photography'];

export function buildSeed(opts: { date?: string } = {}): SeedData {
  const date = opts.date ?? '2026-10-03';
  const r = rng(20260930);
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(r() * 16).toString(16)).join('');
  const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
  const at = (h: string) => new Date(`${date}T${h}:00:00+05:30`).toISOString();
  const win = (a: string, b: string) => ({ start: at(a), end: at(b) });
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];

  const eventId = uuid();
  const event: EventRow = {
    id: eventId,
    name: 'TSEC Fest 2026',
    venue: 'TSEC Campus, Bandra West, Mumbai',
    starts_at: at('09'),
    ends_at: at('21'),
    clock_offset_minutes: 0,
  };

  const zoneIds = ZONE_PLAN.map(() => uuid());
  const zoneIdByName = new Map<string, string>(ZONE_PLAN.map((z, i) => [z.name, zoneIds[i]]));

  // staff
  const staff: Volunteer[] = STAFF.map((s, i) => ({
    id: uuid(), event_id: eventId, name: s.name, email: `${s.name.toLowerCase().replace(/[^a-z]+/g, '.')}@crewpulse.demo`,
    phone: `+91 98${String(10000000 + i * 1234567).slice(0, 8)}`, role: s.role, skills: [...s.skills],
    availability: [win('09', '21')], preferred_zone_ids: [], max_hours: 12, reliability: 1, verified: true,
  }));

  const zones: Zone[] = ZONE_PLAN.map((z, i) => ({
    id: zoneIds[i], event_id: eventId, name: z.name, color: z.color,
    map_x: z.rect[0], map_y: z.rect[1], map_w: z.rect[2], map_h: z.rect[3],
    coordinator_id: staff[z.coord].id,
  }));

  // primary skill list, shuffled
  const primaries = PRIMARY.flatMap(([skill, n]) => Array<string>(n).fill(skill));
  for (let i = primaries.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [primaries[i], primaries[j]] = [primaries[j], primaries[i]];
  }

  // fixed availability for the scarce skills so gaps are predictable
  const faAvail = [[['09', '21']], [['09', '18']], [['12', '21']], [['09', '15']]];
  const avAvail = [[['09', '21']], [['09', '21']], [['09', '15']], [['12', '21']], [['15', '21']], [['09', '12']]];
  let faSeen = 0;
  let avSeen = 0;

  const volunteers: Volunteer[] = NAMES.map((name, i) => {
    const primary = primaries[i];
    const skills = [primary];
    const extras = Math.floor(r() * 3); // 0..2 extra skills
    while (skills.length < 1 + extras) {
      const s = pick(EXTRA_SKILLS);
      if (!skills.includes(s)) skills.push(s);
    }

    let windows: string[][];
    let maxHours = 6;
    if (primary === 'First Aid') windows = faAvail[faSeen++];
    else if (primary === 'AV/Tech') {
      const k = avSeen++;
      windows = avAvail[k];
      if (k === 5) maxHours = 3;
    } else {
      const p = r();
      if (p < 0.4) windows = [['09', '21']];
      else if (p < 0.55) windows = [['09', '15']];
      else if (p < 0.75) windows = [['12', '21']];
      else if (p < 0.85) windows = [['15', '21']];
      else if (p < 0.93) windows = [['09', '18']];
      else windows = [['09', '12'], ['18', '21']];
      const m = r();
      maxHours = m < 0.15 ? 9 : m < 0.25 ? 3 : 6;
    }

    const home = zoneIdByName.get(SKILL_ZONE[primary])!;
    const preferred = [home];
    const wanted = 1 + Math.floor(r() * 2); // 2..3 preferred zones in total
    while (preferred.length < 1 + wanted) {
      const z = pick(zoneIds);
      if (!preferred.includes(z)) preferred.push(z);
    }

    const first = name.split(' ')[0].toLowerCase();
    return {
      id: uuid(), event_id: eventId, name,
      email: `${first}.${i + 1}@example.in`,
      phone: `+91 ${pick(['98', '97', '99', '90', '88'])}${String(Math.floor(r() * 1e8)).padStart(8, '0')}`,
      role: 'volunteer' as const, skills, availability: windows.map(([a, b]) => win(a, b)),
      preferred_zone_ids: preferred, max_hours: maxHours,
      reliability: Math.round((0.6 + r() * 0.4) * 100) / 100,
      verified: r() < 0.85,
    };
  });

  const shifts: Shift[] = ZONE_PLAN.flatMap((z, zi) =>
    BLOCKS.map(([a, b], bi) => ({
      id: uuid(), event_id: eventId, zone_id: zoneIds[zi], role_name: z.role,
      required_skills: [...z.skills], starts_at: at(a), ends_at: at(b), headcount: z.hc[bi],
    })),
  );

  return { event, zones, volunteers: [...staff, ...volunteers], shifts };
}
