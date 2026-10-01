import { eventRole, fail, handle, HttpError, ok } from '@/lib/api';
import { updateProfile } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

const BUCKET = 'avatars';
let bucketReady = false;

/**
 * Photo upload (the browser has already resized it to a small square JPEG).
 * No volunteerId: updates the caller's own profile photo (and their roster copies).
 * With volunteerId: a coordinator sets the photo of a roster volunteer.
 */
export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return fail('Invalid upload.'); }
  const file = form.get('file');
  const volunteerId = (form.get('volunteerId') as string | null) || null;
  return handle(req, {}, async ({ db, user }) => {
    if (!(file instanceof File)) throw new HttpError(400, 'Choose a photo.');
    if (!file.type.startsWith('image/')) throw new HttpError(400, 'That file is not an image.');
    if (file.size > 2_000_000) throw new HttpError(400, 'That photo is too large (max 2 MB).');

    let ownerKey = user.id;
    if (volunteerId) {
      const { data: v } = await db.from('volunteers').select('event_id').eq('id', volunteerId).maybeSingle();
      if (!v) throw new HttpError(404, 'Volunteer not found.');
      const role = await eventRole(db, user.id, v.event_id);
      if (role !== 'owner' && role !== 'coordinator') throw new HttpError(403, 'Only coordinators can change a roster photo.');
      ownerKey = volunteerId;
    }

    if (!bucketReady) {
      const { error } = await db.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 2_000_000 });
      if (error && !/already exists|duplicate/i.test(error.message)) throw new HttpError(500, `Storage is not ready: ${error.message}`);
      bucketReady = true;
    }
    const path = `${ownerKey}/${Date.now()}.jpg`;
    const { error: upErr } = await db.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
    if (upErr) throw new HttpError(500, upErr.message);
    const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    if (volunteerId) await db.from('volunteers').update({ avatar_url: url }).eq('id', volunteerId);
    else await updateProfile(user.id, { avatar_url: url }, db);
    return ok({ url });
  });
}
