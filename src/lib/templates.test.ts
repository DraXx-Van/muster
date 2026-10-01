import { describe, expect, it } from 'vitest';
import { SKILLS } from './types';
import { TEMPLATES, autoLayout, buildFromTemplate, makeJoinCode, planBlocks, seatsFor } from './templates';

const day = (h: string) => new Date(`2026-10-03T${h}:00+05:30`).toISOString();

describe('templates', () => {
  it('only use known skills and unique zone names', () => {
    for (const t of TEMPLATES) {
      const names = t.zones.map((z) => z.name);
      expect(new Set(names).size).toBe(names.length);
      for (const z of t.zones) for (const s of z.skills) expect(SKILLS as readonly string[]).toContain(s);
      for (const task of t.tasks) expect(names).toContain(task.zone);
    }
  });

  it('plans consecutive time blocks, last one may be shorter', () => {
    const blocks = planBlocks(day('09:00'), day('20:00'), 3);
    expect(blocks).toHaveLength(4);
    expect(blocks[0].end).toBe(blocks[1].start);
    expect(blocks[3].end).toBe(day('20:00'));
  });

  it('generates zones x blocks shifts and scales crew size', () => {
    const fest = TEMPLATES.find((t) => t.id === 'college-fest')!;
    const med = buildFromTemplate(fest, { startISO: day('09:00'), endISO: day('21:00'), crew: 'medium' });
    expect(med.zones).toHaveLength(8);
    expect(med.shifts).toHaveLength(32);
    const test = buildFromTemplate(fest, { startISO: day('09:00'), endISO: day('21:00'), crew: 'test' });
    expect(test.shifts.every((s) => s.headcount === 1)).toBe(true);
    expect(test.seats).toBe(32);
    expect(med.seats).toBeGreaterThan(test.seats);
  });

  it('lets the coordinator pick a subset of zones and drops tasks of removed zones', () => {
    const fest = TEMPLATES.find((t) => t.id === 'college-fest')!;
    const p = buildFromTemplate(fest, { startISO: day('09:00'), endISO: day('12:00'), crew: 'test', zones: ['Entry Gate', 'First Aid'] });
    expect(p.zones.map((z) => z.name)).toEqual(['Entry Gate', 'First Aid']);
    expect(p.shifts).toHaveLength(2);
    expect(p.tasks.every((t) => ['Entry Gate', 'First Aid'].includes(t.zone))).toBe(true);
  });

  it('blank template is empty', () => {
    const blank = TEMPLATES.find((t) => t.id === 'blank')!;
    expect(buildFromTemplate(blank, { startISO: day('09:00'), endISO: day('18:00'), crew: 'medium' }).shifts).toEqual([]);
  });

  it('seatsFor never returns less than 1', () => {
    expect(seatsFor(1, 'small')).toBe(1);
    expect(seatsFor(5, 'large')).toBe(8);
  });
});

describe('autoLayout', () => {
  it('fits inside the 800x480 map without overlaps, for 1 to 16 zones', () => {
    for (let n = 1; n <= 16; n++) {
      const r = autoLayout(n);
      expect(r).toHaveLength(n);
      for (const a of r) {
        expect(a.map_x).toBeGreaterThanOrEqual(0); expect(a.map_y).toBeGreaterThanOrEqual(0);
        expect(a.map_x + a.map_w).toBeLessThanOrEqual(800); expect(a.map_y + a.map_h).toBeLessThanOrEqual(480);
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = r[i], b = r[j];
        const overlap = a.map_x < b.map_x + b.map_w && b.map_x < a.map_x + a.map_w && a.map_y < b.map_y + b.map_h && b.map_y < a.map_y + a.map_h;
        expect(overlap).toBe(false);
      }
    }
  });
});

describe('join codes', () => {
  it('are 6 unambiguous characters', () => {
    for (let i = 0; i < 50; i++) expect(makeJoinCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});
