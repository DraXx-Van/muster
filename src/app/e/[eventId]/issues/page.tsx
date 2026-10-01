'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, CheckCheck, Loader2, Megaphone, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/lib/data';
import { acknowledgeIssue, resolveIssue } from '@/lib/db/queries';
import { volunteerName, zoneName } from '@/lib/derive';
import type { Issue } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/common/kit';
import { IssueDialog } from '@/components/ops/IssueDialog';
import { CATEGORY, CountdownRing, EscalationSteps, LEVELS, SEVERITY } from '@/components/ops/IssueParts';

const ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export default function IssuesPage() {
  const { snap, error, refresh, real, me } = useData();
  const [tab, setTab] = useState<'open' | 'resolved' | 'all'>('open');
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  if (error && !snap) return <ErrorState message={error.message} onRetry={() => void refresh()} />;
  if (!snap) return <PageSkeleton />;

  const list = snap.issues
    .filter((i) => (tab === 'all' ? true : tab === 'open' ? i.status !== 'resolved' : i.status === 'resolved'))
    .sort((a, b) => Number(a.status === 'resolved') - Number(b.status === 'resolved') || ORDER[a.severity] - ORDER[b.severity] || b.created_at.localeCompare(a.created_at));

  const act = async (i: Issue, kind: 'ack' | 'resolve') => {
    setBusy(i.id + kind);
    try {
      if (kind === 'ack') await acknowledgeIssue(i.id, me?.id ?? null);
      else await resolveIssue(i.id);
      toast.success(kind === 'ack' ? 'Acknowledged: escalation stopped' : 'Issue resolved');
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(null); }
  };

  const openCount = snap.issues.filter((i) => i.status !== 'resolved').length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={AlertTriangle}
        title="Issues and escalations"
        description="Urgent issues go to the zone coordinator. If nobody acknowledges in time they escalate to the head coordinator, then the organizer. Timers are compressed for the demo."
        actions={<Button variant="destructive" onClick={() => setDialog(true)}><Megaphone /> Raise issue</Button>}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="open">Open ({openCount})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={tab === 'resolved' ? 'Nothing resolved yet' : 'All clear'} description="Issues raised by volunteers or coordinators show up here, routed and timed." action={<Button variant="outline" onClick={() => setDialog(true)}>Raise a test issue</Button>} />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((i) => {
              const cat = CATEGORY[i.category];
              const sev = SEVERITY[i.severity];
              const resolved = i.status === 'resolved';
              return (
                <motion.li key={i.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                  className={cn('surface relative overflow-hidden p-4 pl-5', resolved && 'opacity-60')}>
                  <span className={cn('absolute inset-y-0 left-0 w-1', sev.bar)} />
                  <div className="flex items-start gap-4">
                    <span className={cn('mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl', sev.bg, sev.text)}><cat.icon className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{cat.label}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase', sev.bg, sev.text)}>{i.severity}</span>
                        <span className="text-sm text-muted-foreground">{zoneName(snap.zones, i.zone_id)}</span>
                      </div>
                      <p className="mt-1 text-sm">{i.description}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <EscalationSteps level={i.escalation_level} resolved={resolved} />
                        <span>{resolved ? 'Resolved' : i.status === 'acknowledged' ? 'Acknowledged by' : 'Waiting on'} <span className="font-medium text-foreground">{volunteerName(snap.volunteers, i.assigned_to)}</span> ({LEVELS[Math.min(i.escalation_level, 2)].toLowerCase()})</span>
                        {i.raised_by && <span>Raised by {volunteerName(snap.volunteers, i.raised_by)}</span>}
                      </div>
                    </div>
                    {i.status === 'open' && <CountdownRing issue={i} real={real} />}
                  </div>
                  {!resolved && (
                    <div className="mt-3 flex justify-end gap-2">
                      {i.status === 'open' && <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => act(i, 'ack')}>{busy === i.id + 'ack' ? <Loader2 className="animate-spin" /> : <Check />} Acknowledge</Button>}
                      <Button size="sm" disabled={busy !== null} onClick={() => act(i, 'resolve')}>{busy === i.id + 'resolve' ? <Loader2 className="animate-spin" /> : <CheckCheck />} Resolve</Button>
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      <IssueDialog open={dialog} onClose={() => setDialog(false)} snap={snap} onCreated={() => void refresh()} />
    </div>
  );
}
