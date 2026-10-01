'use client';
import { useState } from 'react';
import Link from 'next/link';
import { HandHeart, Printer, QrCode, Ticket, Users } from 'lucide-react';
import type { EventRow } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JoinCode } from '@/components/common/EventBits';
import { QrCard, attendeeJoinUrl, volunteerJoinUrl } from '@/components/common/QrCard';

/** Invite people: a QR for attendees (no sign-up) and a join code / link for volunteers. */
export function InviteDialog({ open, onClose, event, attendees }: { open: boolean; onClose: () => void; event: EventRow; attendees: number }) {
  const [tab, setTab] = useState<'attendees' | 'volunteers'>('attendees');
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite people to {event.name}</DialogTitle>
          <DialogDescription>Attendees scan a QR code. Volunteers use the join code.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full"><TabsTrigger value="attendees" className="flex-1"><Ticket className="size-3.5" /> Attendees</TabsTrigger><TabsTrigger value="volunteers" className="flex-1"><HandHeart className="size-3.5" /> Volunteers</TabsTrigger></TabsList>
        </Tabs>

        {tab === 'attendees' ? (
          <div className="space-y-4">
            <QrCard url={attendeeJoinUrl(event.join_code)} filename={`${event.name.replace(/\W+/g, '-').toLowerCase()}-attendee-qr`} />
            <ul className="space-y-1.5 rounded-xl bg-muted/60 p-3 text-[13px] text-muted-foreground">
              <li className="flex gap-2"><QrCode className="mt-0.5 size-3.5 shrink-0 text-primary" />Scanning opens the event page. They only pick a name: no account, no email.</li>
              <li className="flex gap-2"><Users className="mt-0.5 size-3.5 shrink-0 text-primary" /><span><span className="font-medium text-foreground tabular">{attendees}</span> {attendees === 1 ? 'person has' : 'people have'} joined so far.</span></li>
            </ul>
            <Link href={`/e/${event.id}/qr`} onClick={onClose}><Button className="w-full"><Printer /> Open printable poster</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/40 py-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Join code</p>
              <JoinCode code={event.join_code} className="text-3xl tracking-[0.35em]" />
              <p className="text-xs text-muted-foreground">Tap to copy</p>
            </div>
            <QrCard url={volunteerJoinUrl(event.join_code)} filename={`${event.name.replace(/\W+/g, '-').toLowerCase()}-volunteer-qr`} size={160} />
            <p className="text-[13px] text-muted-foreground">Volunteers create a free <span className="font-medium text-foreground">volunteer account</span>, then enter the code (or scan this QR). They add their skills and availability themselves.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
