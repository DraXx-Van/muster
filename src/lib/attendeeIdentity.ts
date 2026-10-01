'use client';
// Attendees have no account. When they scan the event QR they choose a display name and we keep a small identity
// on THIS device: { id, token, name } per event. The token is a secret; the server stores only its hash.
import { useSyncExternalStore } from 'react';

export interface AttendeeIdentity { id: string; token: string; name: string; eventName?: string }
type Store = Record<string, AttendeeIdentity>;

const KEY = 'crewpulse.attendee.v1';
const EVT = 'crewpulse:attendee';

let cacheRaw: string | null | undefined;
let cacheParsed: Store = {};

function readStore(): Store {
  if (typeof window === 'undefined') return cacheParsed;
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage blocked: identity just will not persist */ }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try { cacheParsed = raw ? (JSON.parse(raw) as Store) : {}; } catch { cacheParsed = {}; }
  }
  return cacheParsed;
}

function writeStore(next: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVT));
}

export function saveIdentity(eventId: string, identity: AttendeeIdentity) {
  writeStore({ ...readStore(), [eventId]: identity });
}

export function clearIdentity(eventId: string) {
  const { [eventId]: _gone, ...rest } = readStore();
  void _gone;
  writeStore(rest);
}

export function getIdentity(eventId: string): AttendeeIdentity | undefined {
  return readStore()[eventId];
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener('storage', cb); };
}

const EMPTY: Store = {};

/** All events this device has joined as an attendee. */
export function useIdentities(): Store {
  return useSyncExternalStore(subscribe, readStore, () => EMPTY);
}

export function useIdentity(eventId: string): AttendeeIdentity | undefined {
  return useIdentities()[eventId];
}
