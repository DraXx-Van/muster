import { cleanName, handlePublic, ok, readJson, verifyAttendee } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** An attendee changes the display name shown to the organizers on their alerts and complaints. */
export async function POST(req: Request) {
  const b = await readJson<{ eventId?: string; attendeeId?: string; token?: string; name?: string }>(req);
  return handlePublic(async (db) => {
    const att = await verifyAttendee(db, b.eventId ?? '', b.attendeeId, b.token);
    const name = cleanName(b.name);
    const { error } = await db.from('attendees').update({ name }).eq('id', att.id);
    if (error) throw new Error(error.message);
    return ok({ name });
  });
}
