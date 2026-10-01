'use client';
import { useState } from 'react';
import { Clock, FastForward, FlaskConical, Rewind, RotateCcw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/lib/data';
import { post } from '@/lib/post';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

/** Event time chip with the rehearsal tools (time-travel, chaos) tucked inside. Normally event time is just real time. */
export function ClockControl({ onChaos }: { onChaos: () => void }) {
  const { now, refresh, eventId, offsetMinutes } = useData();
  const [busy, setBusy] = useState(false);
  const [time, setTime] = useState('12:05');

  const move = async (body: { deltaMinutes?: number; time?: string; reset?: boolean }) => {
    setBusy(true);
    try { await post('/api/clock', { eventId, ...body }); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not change the clock'); }
    finally { setBusy(false); }
  };

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="hidden gap-2 rounded-full tabular sm:inline-flex" />}>
        {offsetMinutes ? <FlaskConical className="text-partial" /> : <Clock className="text-muted-foreground" />}
        <span className="font-mono text-[13px]">{timeFmt.format(now)}</span>
        {offsetMinutes !== 0 && <span className="rounded bg-partial/15 px-1.5 text-[10px] font-semibold uppercase text-partial">Demo</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold"><FlaskConical className="size-4 text-primary" /> Demo tools</p>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">Event time follows the real clock. To rehearse, time-travel the whole event: shifts, coverage, check-in windows and hours all follow.</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[-15, 15, 60, 180].map((d) => (
            <Button key={d} variant="secondary" size="sm" disabled={busy} onClick={() => move({ deltaMinutes: d })}>
              {d < 0 ? <Rewind /> : <FastForward />}{d < 0 ? d : `+${d >= 60 ? `${d / 60}h` : d}`}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="flex-1" />
          <Button size="sm" disabled={busy || !time} onClick={() => move({ time })}>Jump to time</Button>
        </div>
        <Button variant="outline" size="sm" className="w-full" disabled={busy || offsetMinutes === 0} onClick={() => move({ reset: true })}><RotateCcw /> Back to real time</Button>
        <div className="border-t pt-3">
          <Button variant="destructive" size="sm" className="w-full" onClick={onChaos}><Zap /> Simulate chaos</Button>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Drops up to 3 volunteers and raises a medical issue, to rehearse your response.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
