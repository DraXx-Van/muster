# Deploying Muster

Muster is one Next.js app (pages and API routes) plus a Supabase project (database, realtime, storage). Vercel hosts the app; Supabase stays where it is.

## 0. Before you start
- A GitHub account with this repo, a Vercel account (free is fine), and the Supabase project.
- Your three Supabase values (Supabase dashboard, Project Settings, API):
  - **Project URL** (`https://xxxx.supabase.co`)
  - **Publishable key** (`sb_publishable_...`), safe for the browser
  - **Secret key** (`sb_secret_...`), server only
- If you ever pasted the secret key anywhere public, create a new one (API keys page, create secret key, delete the old one) and use the new one below.

## 1. Database (Supabase)
Fresh project: SQL Editor, New query, paste all of `supabase/schema.sql`, Run, choose **Run without RLS**.
Existing project that already has an older schema: run the files in `supabase/migrations/` in numeric order instead (they only add things).

Check: Table Editor shows `profiles`, `events`, `volunteers`, `zones`, `shifts`, `assignments`, `tasks`, `issues`, `announcements`, `notifications`, `attendees`, `complaints`.

Realtime is switched on by the schema. Storage buckets (`avatars`, `covers`) are created automatically on first upload.

## 2. Push the code
```bash
git pull --rebase origin main
git push origin main
```
Never commit `.env.local` (it is git-ignored).

## 3. Create the Vercel project
1. vercel.com, **Add New, Project**, import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Build command and output directory: leave the defaults.
3. Open **Environment Variables** and add these for Production, Preview and Development:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | your secret key (do **not** add a `NEXT_PUBLIC_` prefix) |

4. Click **Deploy**. The first build takes about a minute.

`vercel.json` runs the API in Mumbai (`bom1`). If your Supabase project is in another region, change `regions` to the nearest Vercel region (for example `sin1` Singapore, `iad1` US East, `fra1` Frankfurt) and push again.

## 4. Smoke test on the live URL
1. Open the site, **Get started**, create a **Coordinator** account.
2. **Create event** from a template. Add a cover image in Event setup.
3. **Invite, Attendees**: scan the QR code with your phone. It must open `https://<your-domain>/join/CODE`.
4. On the phone: enter a name, check you land on the live page, send a test alert.
5. Back on the laptop: the alert appears under that name (Complaints, and Issues for medical or safety).
6. Create a **Volunteer** account in a private window, join with the code, set skills and availability.
7. Back as the coordinator: **Assignments, Auto-assign, Apply**.

## 5. Custom domain (optional)
Vercel, Project, Settings, Domains, add your domain and follow the DNS instructions. QR codes and links use whatever domain the page is opened on, so print the poster **after** the final domain is live (a poster made on the `*.vercel.app` URL keeps working, but it is nicer to print the final one).

## 6. Day-of-event checklist
- Open the QR poster and print it (Print poster button). Put it at the gates and info desk.
- Share the volunteer join code with the crew.
- Keep the dashboard open on a big screen; the live activity feed and the "Needs attention" bell are the main views.
- Mobile data matters: attendees and volunteers need internet. Test on the venue network.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Pages load but sign-up or data fails | The three env vars are missing or wrong in Vercel. Fix them, then **Redeploy**. |
| "Could not find the table ..." | The schema was not applied to this Supabase project. Run `supabase/schema.sql`. |
| "Storage is not ready" on photo upload | The secret key is missing or wrong in Vercel. |
| Attendee QR opens but "link is not valid" | The event was deleted, or the QR is from a different Supabase project. |
| Realtime updates do not arrive | They fall back to refreshing every few seconds. Check Supabase, Database, Replication, and that the tables are in the `supabase_realtime` publication (the schema does this). |
| Build fails on Vercel | Run `npm run build` locally and read the first error. |

## Before a public launch (recommended)
- **Row Level Security** is off. The app and API routes check roles, but add RLS policies so the database itself enforces it.
- Add password reset and email verification for coordinator and volunteer accounts.
- Add rate limiting on the public join and complaint endpoints.
- Rotate the Supabase secret key if it has ever been shared.
