// Pure clock math (safe on server and client).
export const getEventNow = (offsetMinutes: number, real: Date = new Date()): Date =>
  new Date(real.getTime() + offsetMinutes * 60_000);

/** Offset (minutes) that makes event time equal `target`, given the current real time. */
export const offsetFor = (target: Date, real: Date = new Date()): number =>
  Math.round((target.getTime() - real.getTime()) / 60_000);
