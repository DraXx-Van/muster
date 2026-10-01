'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCheck, Eye, Loader2, MessageSquareReply, MessagesSquare, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { Complaint } from '@/lib/types';
import { useData } from '@/lib/data';
import { updateComplaint } from '@/lib/db/queries';
import { zoneName } from '@/lib/derive';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/common/kit';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, categoryLabel } from '@/components/common/complaint';
import { ago } from '@/components/dashboard/LiveFeed';

export default function ComplaintsPage() {
  const { snap, error, refresh, real } = useData();
  const [tab, setTab] = useState<'active' | 'resolved' | 'all'>('active');
  const [reply, setReply] = useState<Complaint | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  if (error && !snap) return <ErrorState message={error.message} onRetry={() => void refresh()} />;
  if (!snap) return <PageSkeleton />;

  const list = snap.complaints.filter((c) => (tab === 'all' ? true : tab === 'active' ? c.status !== 'resolved' : c.status === 'resolved'));
  const active = snap.complaints.filter((c) => c.status !== 'resolved').length;

  const review = async (c: Complaint) => {
    try { await updateComplaint(c.id, { status: 'in_review', response: c.response }); toast.success('Marked as in review. The attendee can see this.'); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not update'); }
  };

  const resolve = async () => {
    if (!reply) return;
    if (text.trim().length < 3) { toast.error('Write a short reply for the attendee'); return; }
    setBusy(true);
    try {
      await updateComplaint(reply.id, { status: 'resolved', response: text.trim() });
      toast.success('Resolved. The attendee sees your reply instantly.');
      setReply(null); setText('');
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not resolve'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader icon={MessagesSquare} title="Complaints" description="Feedback and problems reported by attendees. Reply and resolve, and they see the status live. Medical and safety complaints also raise an issue automatically." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="active">Needs attention ({active})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <EmptyState icon={MessagesSquare} title={tab === 'resolved' ? 'Nothing resolved yet' : snap.complaints.length ? 'All caught up' : 'No complaints yet'}
          description={snap.attendees.length ? 'Attendees can lodge complaints from their phone. They show up here instantly.' : 'Attendees join with your event join code, then they can lodge complaints and read your announcements.'} />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((c) => {
              const cat = COMPLAINT_CATEGORIES.find((x) => x.value === c.category);
              const st = COMPLAINT_STATUS[c.status];
              const Icon = cat?.icon ?? MessagesSquare;
              return (
                <motion.li key={c.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  className={cn('surface p-4', c.status === 'resolved' && 'opacity-70', cat?.urgent && c.status !== 'resolved' && 'border-gap/40')}>
                  <div className="flex items-start gap-3">
                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', cat?.urgent ? 'bg-gap/15 text-gap' : 'bg-muted text-muted-foreground')}><Icon className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{categoryLabel(c.category)}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', st.cls)}>{st.label}</span>
                        {c.issue_id && <span className="inline-flex items-center gap-1 rounded-full bg-gap/15 px-2 py-0.5 text-[11px] font-medium text-gap"><ShieldAlert className="size-3" />Issue raised</span>}
                        <span className="ml-auto text-xs text-muted-foreground tabular">{ago(real.getTime() - new Date(c.created_at).getTime())}</span>
                      </div>
                      <p className="mt-1 text-sm">{c.description}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">From {c.submitter_name}{c.contact ? ` · ${c.contact}` : ''}{c.zone_id ? ` · ${zoneName(snap.zones, c.zone_id)}` : ''}</p>
                      {c.response && <p className="mt-2 rounded-lg bg-muted/50 p-2.5 text-sm"><span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Your reply</span>{c.response}</p>}
                    </div>
                  </div>
                  {c.status !== 'resolved' && (
                    <div className="mt-3 flex justify-end gap-2">
                      {c.status === 'open' && <Button size="sm" variant="outline" onClick={() => review(c)}><Eye /> Start review</Button>}
                      <Button size="sm" onClick={() => { setReply(c); setText(c.response ?? ''); }}><MessageSquareReply /> Reply and resolve</Button>
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <Dialog open={!!reply} onOpenChange={(o) => { if (!o) { setReply(null); setText(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to {reply?.submitter_name}</DialogTitle>
            <DialogDescription>{reply && categoryLabel(reply.category)}: {reply?.description}</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} placeholder="What was done, or what happens next?" value={text} onChange={(e) => setText(e.target.value)} />
          <Button onClick={resolve} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <CheckCheck />} Send reply and resolve</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
