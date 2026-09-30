'use client';
import { CircleHelp, HeartPulse, PackageX, ShieldAlert, Users, type LucideIcon } from 'lucide-react';
import type { Issue, IssueCategory, IssueSeverity } from '@/lib/types';
import { ACK_SECONDS } from '@/lib/engine';
import { cn } from '@/lib/utils';

export const CATEGORY: Record<IssueCategory, { label: string; icon: LucideIcon }> = {
  medical: { label: 'Medical', icon: HeartPulse },
  crowd_surge: { label: 'Crowd surge', icon: Users },
  missing_equipment: { label: 'Missing equipment', icon: PackageX },
  security: { label: 'Security', icon: ShieldAlert },
  other: { label: 'Other', icon: CircleHelp },
};

export const SEVERITY: Record<IssueSeverity, { text: string; bg: string; bar: string }> = {
  critical: { text: 'text-gap', bg: 'bg-gap/15', bar: 'bg-gap' },
  high: { text: 'text-partial', bg: 'bg-partial/15', bar: 'bg-partial' },
  medium: { text: 'text-info', bg: 'bg-info/15', bar: 'bg-info' },
  low: { text: 'text-muted-foreground', bg: 'bg-muted', bar: 'bg-muted-foreground' },
};

export const LEVELS = ['Zone coordinator', 'Head coordinator', 'Organizer'];

/** Acknowledge countdown. The ring drains until the deadline, then the issue escalates (real seconds, demo-compressed). */
export function CountdownRing({ issue, real }: { issue: Issue; real: Date }) {
  const total = ACK_SECONDS[issue.severity];
  const left = issue.ack_deadline ? (new Date(issue.ack_deadline).getTime() - real.getTime()) / 1000 : 0;
  const frac = Math.max(0, Math.min(1, left / total));
  const r = 20;
  const c = 2 * Math.PI * r;
  const overdue = left <= 0;
  const color = overdue ? 'var(--gap)' : frac < 0.34 ? 'var(--partial)' : 'var(--covered)';
  return (
    <div className={cn('relative size-14 shrink-0', overdue && 'pulse-gap')} role="timer" aria-label={overdue ? 'Overdue' : `${Math.ceil(left)} seconds to acknowledge`}>
      <svg viewBox="0 0 48 48" className="size-14 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular" style={{ color }}>
        {overdue ? '0s' : left >= 60 ? `${Math.floor(left / 60)}m` : `${Math.ceil(left)}s`}
      </span>
    </div>
  );
}

export function EscalationSteps({ level, resolved }: { level: number; resolved?: boolean }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Escalation level ${level}`}>
      {LEVELS.map((name, i) => (
        <div key={name} className="flex items-center gap-1.5">
          <span title={name} className={cn('flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
            resolved ? 'border-covered/40 bg-covered/15 text-covered' : i < level ? 'border-gap/40 bg-gap/20 text-gap' : i === level ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground')}>{i + 1}</span>
          {i < LEVELS.length - 1 && <span className={cn('h-px w-4', i < level ? 'bg-gap/60' : 'bg-border')} />}
        </div>
      ))}
    </div>
  );
}
