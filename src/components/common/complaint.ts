// Shared labels for complaint categories and statuses.
import { Apple, Droplets, HeartPulse, MessageSquareWarning, PackageSearch, ShieldAlert, Users, UserRound, type LucideIcon } from 'lucide-react';
import type { ComplaintCategory, ComplaintStatus } from '@/lib/types';

export const COMPLAINT_CATEGORIES: { value: ComplaintCategory; label: string; hint: string; icon: LucideIcon; urgent?: boolean }[] = [
  { value: 'medical', label: 'Medical help', hint: 'Someone is hurt or unwell', icon: HeartPulse, urgent: true },
  { value: 'safety', label: 'Safety concern', hint: 'Something unsafe or threatening', icon: ShieldAlert, urgent: true },
  { value: 'facilities', label: 'Facilities', hint: 'Toilets, seating, cleanliness', icon: Droplets },
  { value: 'food', label: 'Food and water', hint: 'Quality, prices, shortages', icon: Apple },
  { value: 'crowd', label: 'Crowd or queues', hint: 'Overcrowding, long waits', icon: Users },
  { value: 'staff', label: 'Staff or volunteers', hint: 'Behaviour or help received', icon: UserRound },
  { value: 'lost_found', label: 'Lost and found', hint: 'Lost or found something', icon: PackageSearch },
  { value: 'other', label: 'Something else', hint: 'Anything not listed', icon: MessageSquareWarning },
];

export const categoryLabel = (c: ComplaintCategory) => COMPLAINT_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export const COMPLAINT_STATUS: Record<ComplaintStatus, { label: string; cls: string }> = {
  open: { label: 'Received', cls: 'bg-partial/15 text-partial' },
  in_review: { label: 'In review', cls: 'bg-info/15 text-info' },
  resolved: { label: 'Resolved', cls: 'bg-covered/15 text-covered' },
};
