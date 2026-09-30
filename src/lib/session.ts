'use client';
// Demo login: the picked person is stored in localStorage (real auth would replace this).
import { useSyncExternalStore } from 'react';

const KEY = 'crewpulse.person';
const EVT = 'crewpulse:session';

export function setSession(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch { /* storage blocked: session just won't persist */ }
  window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener('storage', cb); };
}
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

/** undefined while hydrating, null when logged out, else the person id. */
export function useSessionId(): string | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
