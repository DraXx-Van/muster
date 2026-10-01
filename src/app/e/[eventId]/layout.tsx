'use client';
import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { DataProvider } from '@/lib/data';
import { CoordShell } from '@/components/coord/Shell';

export default function CoordLayout({ children }: { children: ReactNode }) {
  const { eventId } = useParams<{ eventId: string }>();
  return (
    <DataProvider eventId={eventId}>
      <CoordShell>{children}</CoordShell>
    </DataProvider>
  );
}
