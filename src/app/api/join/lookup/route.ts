import { handlePublic, HttpError, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Public: what the QR landing page shows before someone joins. Only non-sensitive event info. */
export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get('code') ?? '').trim().toUpperCase();
  return handlePublic(async (db) => {
    if (code.length < 4) throw new HttpError(400, 'Missing join code.');
    const { data } = await db.from('events').select('id, name, venue, description, starts_at, ends_at, cover_url, clock_offset_minutes').eq('join_code', code).maybeSingle();
    if (!data) throw new HttpError(404, 'This QR code or link is not valid any more. Ask the organizers for a new one.');
    return ok({ event: data });
  });
}
