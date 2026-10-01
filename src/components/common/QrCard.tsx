'use client';
import { useRef } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const LOGO = { src: '/icon.svg', height: 18, width: 18, excavate: true } as const;

/** The public URL attendees open after scanning. Works on any deployment because it is built from the current origin. */
export const attendeeJoinUrl = (code: string) => `${typeof window === 'undefined' ? '' : window.location.origin}/join/${code}`;
export const volunteerJoinUrl = (code: string) => `${typeof window === 'undefined' ? '' : window.location.origin}/v?code=${code}`;

/** A scannable QR code with copy-link and PNG download. */
export function QrCard({ url, filename, size = 208, className, showActions = true }: { url: string; filename: string; size?: number; className?: string; showActions?: boolean }) {
  const canvasWrap = useRef<HTMLDivElement>(null);

  const download = () => {
    const canvas = canvasWrap.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${filename}.png`;
    a.click();
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
    catch { toast.error('Could not copy. Select the link and copy it by hand.'); }
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="rounded-3xl border bg-white p-4 shadow-card">
        <QRCodeSVG value={url} size={size} level="H" marginSize={0} fgColor="#1b1d2e" bgColor="#ffffff" imageSettings={{ ...LOGO, height: Math.round(size * 0.16), width: Math.round(size * 0.16) }} />
      </div>
      {/* hidden high-resolution canvas used for the PNG download */}
      <div ref={canvasWrap} className="hidden" aria-hidden>
        <QRCodeCanvas value={url} size={1024} level="H" marginSize={4} fgColor="#1b1d2e" bgColor="#ffffff" />
      </div>
      <p className="max-w-full truncate rounded-lg bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground" title={url}>{url.replace(/^https?:\/\//, '')}</p>
      {showActions && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copy}><Copy /> Copy link</Button>
          <Button variant="outline" size="sm" onClick={download}><Download /> Download PNG</Button>
        </div>
      )}
    </div>
  );
}
