'use client';
import Link from 'next/link';
import { ArrowRight, BellRing, CalendarPlus, Check, LayoutDashboard, LifeBuoy, QrCode, Smartphone, Sparkles, Users } from 'lucide-react';
import { HOME, useAuth } from '@/lib/auth';
import { TEMPLATES } from '@/lib/templates';
import { Button } from '@/components/ui/button';
import { EventCover, Logo } from '@/components/common/visual';
import { ProductMock } from '@/components/landing/ProductMock';

const STEPS = [
  { icon: CalendarPlus, title: 'Start from a template', text: 'Pick a college fest, marathon, conference or festival. Zones, shifts and starter tasks are ready in seconds. Change anything you like.' },
  { icon: QrCode, title: 'Invite your crew and guests', text: 'Volunteers join with a code and add their skills. Attendees just scan a QR code and pick a name. No accounts for guests.' },
  { icon: LayoutDashboard, title: 'Run it live', text: 'One click assigns the right people. When someone drops out, replacements are ranked instantly and everyone is kept in the loop.' },
];

const FEATURES = [
  { icon: Sparkles, title: 'Smart assignment', text: 'Matches skills, availability, preferences and fair hours together, and explains every choice.' },
  { icon: LayoutDashboard, title: 'A dashboard that shows what needs you', text: 'A live venue map, coverage by time block, issues and complaints, all in one calm view.' },
  { icon: QrCode, title: 'QR join for attendees', text: 'Print the poster, guests scan it and follow live updates. No app to install, no sign-up.' },
  { icon: BellRing, title: 'Alerts that escalate', text: 'Urgent issues reach the right coordinator and escalate automatically if nobody responds.' },
  { icon: LifeBuoy, title: 'Complaints inbox', text: 'Attendees report problems by name. Reply and resolve, and they see the progress live.' },
  { icon: Smartphone, title: 'Volunteer phone app', text: 'Shifts, one-tap check-in and out, hours worked, announcements and a way to raise issues.' },
];

export default function Landing() {
  const { profile, user, loading } = useAuth();
  const signedIn = !loading && user && profile;
  const appHref = signedIn ? HOME[profile.account_type] : '/login';

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(60%_50%_at_70%_0%,oklch(0.9_0.06_275/0.55),transparent),radial-gradient(40%_40%_at_0%_20%,oklch(0.93_0.04_220/0.5),transparent)] dark:opacity-30" />

      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Logo />
          <nav className="ml-6 hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#templates" className="transition-colors hover:text-foreground">Templates</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {signedIn ? (
              <Link href={appHref}><Button>Open your {profile.account_type === 'coordinator' ? 'events' : 'events'} <ArrowRight /></Button></Link>
            ) : (
              <>
                <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
                <Link href="/login?mode=signup"><Button>Get started</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm"><span className="size-1.5 rounded-full bg-emerald-500" />Volunteer and crowd coordination for events</span>
          <h1 className="mt-5 text-[44px] font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">Your event crew, <span className="bg-linear-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">coordinated live.</span></h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">Assign volunteers by skill, spot gaps the moment they appear, and keep every attendee in the loop. Start from a template and be running in minutes.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={signedIn ? appHref : '/login?mode=signup'}><Button size="lg" className="h-12 px-6 text-base">{signedIn ? 'Go to your events' : 'Create your event'} <ArrowRight /></Button></Link>
            <a href="#how"><Button size="lg" variant="outline" className="h-12 px-6 text-base">See how it works</Button></a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {['Free to try', 'Guests join by QR, no sign-up', 'Works on any phone'].map((t) => <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-emerald-600" />{t}</li>)}
          </ul>
        </div>
        <ProductMock />
      </section>

      {/* how it works */}
      <section id="how" className="border-y bg-card/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">From idea to a running event in three steps</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border bg-background p-6 shadow-card">
                <span className="brand-gradient flex size-11 items-center justify-center rounded-xl text-white"><s.icon className="size-5" /></span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Features</p>
        <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Everything the crew needs, on the day</h2>
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><f.icon className="size-5" /></span>
              <div><h3 className="font-semibold tracking-tight">{f.title}</h3><p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{f.text}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* templates */}
      <section id="templates" className="border-y bg-card/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Templates</p>
          <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">A head start for every kind of event</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.filter((t) => t.id !== 'blank').map((t) => (
              <div key={t.id} className="overflow-hidden rounded-2xl border bg-background shadow-card">
                <EventCover event={{ id: t.id, name: t.name, template_id: t.id }} className="h-28" overlay={false} />
                <div className="p-5"><h3 className="font-semibold tracking-tight">{t.name}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Users className="size-3.5" />{t.zones.length} zones ready to use</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="brand-gradient relative overflow-hidden rounded-3xl px-8 py-14 text-center text-white sm:px-16">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Ready to run your next event?</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/85">Create an event from a template, share the QR code and let the crew do the rest.</p>
          <Link href={signedIn ? appHref : '/login?mode=signup'} className="relative mt-8 inline-block"><Button size="lg" variant="secondary" className="h-12 bg-white px-7 text-base text-indigo-700 hover:bg-white/90">{signedIn ? 'Go to your events' : 'Get started free'} <ArrowRight /></Button></Link>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground">
          <Logo />
          <p>Volunteer and crowd coordination for events.</p>
          <div className="flex gap-5"><Link href="/login" className="hover:text-foreground">Sign in</Link><Link href="/login?mode=signup" className="hover:text-foreground">Create account</Link></div>
        </div>
      </footer>
    </div>
  );
}
