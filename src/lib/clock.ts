'use client';
// Demo clock. Event "now" = real now + events.clock_offset_minutes. ALL shift/coverage logic uses this, never new Date().
import { useEffect, useState } from 'react';
import type { EventRow } from './types';

export { getEventNow, offsetFor } from './clockMath';
import { getEventNow } from './clockMath';

/** Ticks every second so countdowns and "current shift" logic stay fresh. */
export function useEventClock(event: Pick<EventRow, 'clock_offset_minutes'> | null | undefined) {
  const offset = event?.clock_offset_minutes ?? 0;
  const [real, setReal] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setReal(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return { now: getEventNow(offset, real), real, offsetMinutes: offset };
}
