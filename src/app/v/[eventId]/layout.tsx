'use client';
import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { DataProvider } from '@/lib/data';
import { VolShell } from '@/components/volunteer/VolShell';

export default function VolLayout({ children }: { children: ReactNode }) {
  const { eventId } = useParams<{ eventId: string }>();
  return (
    <DataProvider eventId={eventId}>
      <VolShell>{children}</VolShell>
    </DataProvider>
  );
}
