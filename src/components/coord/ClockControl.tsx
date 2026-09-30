'use client';
import { useState } from 'react';
import { Clock, FastForward, Rewind, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/lib/data';
import { post } from '@/lib/post';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

/** Demo clock chip + time-travel controls + chaos button. Every shift/coverage calculation follows this clock. */
export function ClockControl({ onChaos }: { onChaos: () => void }) {
  const { now, refresh } = useData();
  const [busy, setBusy] = useState(false);
  const [time, setTime] = useState('12:05');

  const move = async (body: { deltaMinutes?: number; time?: string }) => {
    setBusy(true);
    try { await post('/api/clock', body); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not change the clock'); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-2 tabular" />}>
          <Clock className="text-primary" />
          <span className="hidden text-muted-foreground sm:inline">Event time</span>
          <span className="font-mono">{timeFmt.format(now)}</span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div>
            <p className="text-sm font-medium">Demo clock</p>
            <p className="text-xs text-muted-foreground">Time-travel the whole event. Shifts, coverage, check-in windows and hours all follow this clock.</p>
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
            <Button size="sm" disabled={busy || !time} onClick={() => move({ time })}>Jump</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['08:45', '11:50', '12:05', '15:10', '18:05'].map((t) => (
              <button key={t} onClick={() => move({ time: t })} className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t}</button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button variant="destructive" size="sm" onClick={onChaos} title="Drop 3 volunteers and raise a medical issue"><Zap /> <span className="hidden sm:inline">Chaos</span></Button>
    </div>
  );
}
