'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useSessionId } from '@/lib/session';

/** Entry point: send people to their home screen (or the login picker). */
export default function Home() {
  const router = useRouter();
  const id = useSessionId();
  useEffect(() => {
    if (id === undefined) return;
    router.replace(id ? '/dashboard' : '/login'); // coordinator shell re-routes volunteers to /me
  }, [id, router]);
  return <div className="flex flex-1 items-center justify-center"><Skeleton className="h-10 w-48" /></div>;
}
