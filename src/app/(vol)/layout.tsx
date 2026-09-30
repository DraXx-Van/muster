'use client';
import type { ReactNode } from 'react';
import { DataProvider } from '@/lib/data';
import { VolShell } from '@/components/volunteer/VolShell';

export default function VolLayout({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <VolShell>{children}</VolShell>
    </DataProvider>
  );
}
