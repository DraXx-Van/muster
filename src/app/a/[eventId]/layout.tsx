'use client';
import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { AttendeeProvider } from '@/lib/attendee';
import { AttendeeShell } from '@/components/attendee/AttendeeShell';

export default function AttendeeLayout({ children }: { children: ReactNode }) {
  const { eventId } = useParams<{ eventId: string }>();
  return (
    <AttendeeProvider eventId={eventId}>
      <AttendeeShell>{children}</AttendeeShell>
    </AttendeeProvider>
  );
}
