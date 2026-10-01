// Client-side helper for calling our API routes. Sends the signed-in user's token; throws Error(message) so callers can toast it.
import { supabase } from './db/client';

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export async function post<T = unknown>(url: string, body: unknown = {}): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}

/** Multipart upload (photos). */
export async function upload<T = unknown>(url: string, form: FormData): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: await authHeader(), body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Upload failed (${res.status})`);
  return json as T;
}
