'use client';
// Visual building blocks: logo, event cover art, empty-state illustration, zone icons, skill colours.
import { createElement, type ReactNode } from 'react';
import {
  Baby, BedDouble, Bus, Camera, CarFront, Clapperboard, Coffee, DoorOpen, Droplets, FlaskConical, Footprints, HeartPulse, Info, Luggage, MapPin, Megaphone,
  Mic2, Music, Package, ScanLine, ShieldCheck, ShoppingBag, Soup, Store, Ticket, Utensils, UsersRound, Wrench, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------- logo ----------
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('brand-gradient inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] text-white shadow-[0_6px_16px_-6px_oklch(0.5_0.22_270/0.7)]', className)}>
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2.5 13h4l2.2-6 3.6 10 2.6-7 1.2 3h5.4" />
      </svg>
    </span>
  );
}

export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={cn('text-[15px] font-semibold tracking-tight', textClassName)}>CrewPulse</span>
    </span>
  );
}

// ---------- event cover ----------
const PALETTES: [string, string, string][] = [
  ['oklch(0.55 0.23 280)', 'oklch(0.5 0.2 245)', 'oklch(0.72 0.14 200)'],
  ['oklch(0.58 0.2 330)', 'oklch(0.52 0.22 285)', 'oklch(0.72 0.14 50)'],
  ['oklch(0.55 0.15 175)', 'oklch(0.5 0.17 230)', 'oklch(0.75 0.14 130)'],
  ['oklch(0.6 0.2 40)', 'oklch(0.55 0.22 10)', 'oklch(0.75 0.14 85)'],
  ['oklch(0.5 0.18 255)', 'oklch(0.45 0.18 295)', 'oklch(0.7 0.14 190)'],
];
const TEMPLATE_PALETTE: Record<string, number> = { 'college-fest': 0, marathon: 2, conference: 4, 'music-festival': 1, blank: 3 };

function hashOf(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Event cover: the uploaded image, or generated gradient art that is stable per event. */
export function EventCover({ event, className, children, overlay = true }: {
  event: { id: string; name: string; cover_url?: string | null; template_id?: string | null }; className?: string; children?: ReactNode; overlay?: boolean;
}) {
  const h = hashOf(event.id + event.name);
  const [a, b, c] = PALETTES[event.template_id && event.template_id in TEMPLATE_PALETTE ? TEMPLATE_PALETTE[event.template_id] : h % PALETTES.length];
  const rot = 100 + (h % 80);
  return (
    <div className={cn('relative isolate overflow-hidden', className)} style={event.cover_url ? undefined : { backgroundImage: `linear-gradient(${rot}deg, ${a}, ${b})` }}>
      {event.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.cover_url} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <svg className="absolute inset-0 size-full opacity-90" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <radialGradient id={`g${h}`} cx="0.8" cy="0.1" r="0.7">
              <stop offset="0" stopColor={c} stopOpacity="0.85" />
              <stop offset="1" stopColor={c} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="200" fill={`url(#g${h})`} />
          <circle cx={60 + (h % 40)} cy="170" r="90" fill="white" fillOpacity="0.07" />
          <circle cx={330 - (h % 50)} cy="30" r="60" fill="white" fillOpacity="0.08" />
          <path d={`M0 ${140 + (h % 20)} Q 100 ${100 + (h % 30)} 200 ${140} T 400 ${120 + (h % 20)} V200 H0Z`} fill="white" fillOpacity="0.07" />
          <path d={`M0 ${170} Q 120 ${140 + (h % 25)} 240 ${170} T 400 ${160} V200 H0Z`} fill="white" fillOpacity="0.09" />
        </svg>
      )}
      {overlay && <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />}
      {children && <div className="relative">{children}</div>}
    </div>
  );
}

// ---------- empty-state illustration ----------
export function EmptyArt({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <div className={cn('relative mx-auto flex size-28 items-center justify-center', className)} aria-hidden>
      <span className="absolute inset-0 rounded-full bg-primary/[0.06]" />
      <span className="absolute inset-3 rounded-full bg-primary/[0.08]" />
      <span className="absolute -left-1 top-5 size-3 rounded-full bg-info/40" />
      <span className="absolute -right-1 bottom-6 size-2.5 rounded-full bg-partial/50" />
      <span className="absolute bottom-2 left-4 size-2 rounded-full bg-covered/50" />
      <span className="brand-gradient relative flex size-14 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-10px_oklch(0.5_0.22_270/0.8)]">
        <Icon className="size-6" />
      </span>
    </div>
  );
}

// ---------- zone icons ----------
const ZONE_ICONS: [RegExp, LucideIcon][] = [
  [/first aid|medic|medical|clinic|triage/i, HeartPulse],
  [/parking|shuttle|traffic|transport/i, CarFront],
  [/bus/i, Bus],
  [/registration|bib|check.?in|ticket|desk/i, ScanLine],
  [/stage|main hall|av|sound/i, Mic2],
  [/music|dj|concert/i, Music],
  [/food|catering|canteen|kitchen/i, Utensils],
  [/drink|hydration|water/i, Droplets],
  [/coffee|cafe|lounge|speaker/i, Coffee],
  [/gate|entry|entrance|exit|finish|start/i, DoorOpen],
  [/security|barrier|bag/i, ShieldCheck],
  [/info|help|support/i, Info],
  [/workshop|lab/i, FlaskConical],
  [/baggage|luggage|cloak/i, Luggage],
  [/merch|shop|store/i, ShoppingBag],
  [/photo|media|camera/i, Camera],
  [/route|marshal|track/i, Footprints],
  [/kids|child/i, Baby],
  [/room|breakout|hall/i, Store],
  [/volunteer|crew|team/i, UsersRound],
  [/rest|sleep|hotel/i, BedDouble],
  [/video|film/i, Clapperboard],
  [/announce|pa /i, Megaphone],
  [/supply|store|stock/i, Package],
  [/ticket/i, Ticket],
  [/tool|repair|maintenance/i, Wrench],
  [/soup/i, Soup],
];
function zoneIconFor(name: string): LucideIcon {
  return ZONE_ICONS.find(([re]) => re.test(name))?.[1] ?? MapPin;
}

/** Icon that fits a zone name (first aid, parking, stage, ...). */
export function ZoneIcon({ name, className }: { name: string; className?: string }) {
  return createElement(zoneIconFor(name), { className });
}

/** Zone name with its icon on a tinted chip in the zone colour. */
export function ZoneBadge({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-white" style={{ background: color }}><ZoneIcon name={name} className="size-3.5" /></span>
      <span className="truncate">{name}</span>
    </span>
  );
}

// ---------- skills ----------
const SKILL_TONES: Record<string, string> = {
  'First Aid': 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20',
  'Crowd Control': 'bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/20',
  Registration: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20',
  'AV/Tech': 'bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20',
  'Parking/Traffic': 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20',
  Hospitality: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
  Security: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 ring-zinc-500/20',
  Logistics: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
  Photography: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-pink-500/20',
  Multilingual: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-teal-500/20',
};
export const skillTone = (skill: string) => SKILL_TONES[skill] ?? 'bg-muted text-muted-foreground ring-border';
