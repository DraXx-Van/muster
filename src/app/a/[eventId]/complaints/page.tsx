'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, LifeBuoy, Plus, ShieldAlert } from 'lucide-react';
import { useAttendee } from '@/lib/attendee';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/kit';
import { COMPLAINT_CATEGORIES, categoryLabel } from '@/components/common/complaint';
import { ago } from '@/components/dashboard/LiveFeed';
import type { ComplaintStatus } from '@/lib/types';

const STEPS: { status: ComplaintStatus; label: string }[] = [
  { status: 'open', label: 'Received' },
  { status: 'in_review', label: 'In review' },
  { status: 'resolved', label: 'Resolved' },
];

function Stepper({ status }: { status: ComplaintStatus }) {
  const at = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="mt-3 flex items-center">
      {STEPS.map((s, i) => (
        <li key={s.status} className="flex flex-1 items-center last:flex-none">
          <span className={cn('flex size-5 items-center justify-center rounded-full text-[10px] font-bold', i < at || status === 'resolved' ? 'bg-covered text-white' : i === at ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            {i < at || status === 'resolved' ? <Check className="size-3" /> : i + 1}
          </span>
          <span className={cn('ml-1.5 text-[11px] font-medium', i <= at ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
          {i < STEPS.length - 1 && <span className={cn('mx-2 h-px flex-1', i < at ? 'bg-covered' : 'bg-border')} />}
        </li>
      ))}
    </ol>
  );
}

/** Your reports and their live progress. */
export default function MyReports() {
  const { complaints, zones, eventId, now } = useAttendee();
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div><h1 className="text-[22px] font-semibold leading-tight tracking-tight">My reports</h1><p className="mt-0.5 text-sm text-muted-foreground">Alerts and complaints you sent, with live progress.</p></div>
        <Link href={`/a/${eventId}/complaints/new`}><Button size="sm"><Plus /> New</Button></Link>
      </div>

      {complaints.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="You have not sent anything" description="If something is wrong or you need help, tell the organizers. They will see your name and reply here."
          action={<Link href={`/a/${eventId}/complaints/new`}><Button><Plus /> Send a report</Button></Link>} />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {complaints.map((c) => {
              const Icon = COMPLAINT_CATEGORIES.find((x) => x.value === c.category)?.icon ?? LifeBuoy;
              return (
                <motion.li key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="surface p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{categoryLabel(c.category)}</p>
                      <p className="text-[11px] text-muted-foreground tabular">{ago(now.getTime() - Date.parse(c.created_at))}{c.zone_id ? ` · ${zones.find((z) => z.id === c.zone_id)?.name ?? ''}` : ''}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm">{c.description}</p>
                  <Stepper status={c.status} />
                  {c.issue_id && c.status !== 'resolved' && <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gap"><ShieldAlert className="size-3.5" />The on-site team was alerted right away.</p>}
                  {c.response && <div className="mt-3 rounded-xl bg-muted/60 p-3 text-sm"><p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reply from the organizers</p>{c.response}</div>}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
