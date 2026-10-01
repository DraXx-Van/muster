import { handlePublic, HttpError, ok, readJson } from '@/lib/api';
import type { AccountType } from '@/lib/types';

export const dynamic = 'force-dynamic';

// attendees do not have accounts: they scan a QR code and pick a name
const TYPES: AccountType[] = ['coordinator', 'volunteer'];

/**
 * Creates an account without an email-confirmation step (hackathon friendly), then its profile.
 * The browser signs in right after with the same email and password.
 */
export async function POST(req: Request) {
  const b = await readJson<{ email?: string; password?: string; fullName?: string; phone?: string; accountType?: AccountType }>(req);
  return handlePublic(async (db) => {
    const email = b.email?.trim().toLowerCase() ?? '';
    const name = b.fullName?.trim() ?? '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.');
    if ((b.password ?? '').length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');
    if (name.length < 2) throw new HttpError(400, 'Enter your full name.');
    if (!b.accountType || !TYPES.includes(b.accountType)) throw new HttpError(400, 'Choose what kind of account you need.');

    const { data, error } = await db.auth.admin.createUser({ email, password: b.password!, email_confirm: true, user_metadata: { full_name: name } });
    if (error || !data.user) {
      if (/already|registered|exists/i.test(error?.message ?? '')) throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
      throw new HttpError(400, error?.message ?? 'Could not create the account.');
    }
    const { error: pErr } = await db.from('profiles').insert({ id: data.user.id, full_name: name, email, phone: b.phone?.trim() || null, account_type: b.accountType });
    if (pErr) {
      await db.auth.admin.deleteUser(data.user.id); // do not leave a login without a profile
      throw new HttpError(500, pErr.message);
    }
    return ok({ id: data.user.id });
  });
}
