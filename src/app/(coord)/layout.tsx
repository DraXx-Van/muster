'use client';
import type { ReactNode } from 'react';
import { DataProvider } from '@/lib/data';
import { CoordShell } from '@/components/coord/Shell';

export default function CoordLayout({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <CoordShell>{children}</CoordShell>
    </DataProvider>
  );
}
