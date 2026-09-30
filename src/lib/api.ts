// Small helpers shared by route handlers (server) and the client-side fetch wrapper.
import { NextResponse } from 'next/server';
import type { Snapshot } from './types';
import { getSnapshot } from './db/queries';
import { serverClient } from './db/server';
import { getEventNow } from './clockMath';

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a handler so thrown errors come back as JSON { error } instead of an HTML 500 page. */
export async function handle(fn: (db: ReturnType<typeof serverClient>) => Promise<Response>): Promise<Response> {
  try {
    return await fn(serverClient());
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unexpected error', 500);
  }
}

export async function loadSnapshot(db: ReturnType<typeof serverClient>): Promise<{ snap: Snapshot; now: Date }> {
  const snap = await getSnapshot(db);
  return { snap, now: getEventNow(snap.event.clock_offset_minutes) };
}

