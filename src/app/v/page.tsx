'use client';
import { Suspense } from 'react';
import { JoinedEvents } from '@/components/common/JoinedEvents';

export default function VolunteerHome() {
  return <Suspense><JoinedEvents kind="volunteer" /></Suspense>;
}
