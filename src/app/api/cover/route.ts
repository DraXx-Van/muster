import { COORD, fail, handle, HttpError, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

const BUCKET = 'covers';
let bucketReady = false;

/** Event cover image upload (the browser has already resized it). Coordinators only. */
export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return fail('Invalid upload.'); }
  const file = form.get('file');
  const eventId = form.get('eventId') as string | null;
  return handle(req, { eventId, roles: COORD }, async ({ db }) => {
    if (!(file instanceof File)) throw new HttpError(400, 'Choose an image.');
    if (!file.type.startsWith('image/')) throw new HttpError(400, 'That file is not an image.');
    if (file.size > 4_000_000) throw new HttpError(400, 'That image is too large (max 4 MB).');
    if (!bucketReady) {
      const { error } = await db.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 4_000_000 });
      if (error && !/already exists|duplicate/i.test(error.message)) throw new HttpError(500, `Storage is not ready: ${error.message}`);
      bucketReady = true;
    }
    const path = `${eventId}/${Date.now()}.jpg`;
    const { error: upErr } = await db.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
    if (upErr) throw new HttpError(500, upErr.message);
    const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const { error } = await db.from('events').update({ cover_url: url }).eq('id', eventId!);
    if (error) throw new HttpError(500, error.message);
    return ok({ url });
  });
}
