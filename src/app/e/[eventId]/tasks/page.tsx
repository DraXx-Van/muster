'use client';
import { useState } from 'react';
import { KanbanSquare, ListPlus, ListTodo } from 'lucide-react';
import { useData } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, PageHeader, PageSkeleton, SimpleSelect } from '@/components/common/kit';
import { TaskBoard } from '@/components/ops/TaskBoard';
import { TaskDialog } from '@/components/ops/TaskDialog';

const ALL = 'all';

export default function TasksPage() {
  const { snap, error, refresh, me } = useData();
  const [zone, setZone] = useState(ALL);
  const [open, setOpen] = useState(false);

  if (error && !snap) return <ErrorState message={error.message} onRetry={() => void refresh()} />;
  if (!snap) return <PageSkeleton />;

  const tasks = snap.tasks.filter((t) => zone === ALL || t.zone_id === zone);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        icon={KanbanSquare}
        title="Task board"
        description="On-ground tasks by zone. Drag cards between columns; every browser updates live."
        actions={
          <>
            <div className="w-48"><SimpleSelect value={zone} onChange={setZone} options={[{ value: ALL, label: 'All zones' }, ...snap.zones.map((z) => ({ value: z.id, label: z.name }))]} /></div>
            <Button onClick={() => setOpen(true)}><ListPlus /> New task</Button>
          </>
        }
      />
      {snap.tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="No tasks yet" description="Create the first task for a zone and assign it to a volunteer." action={<Button onClick={() => setOpen(true)}><ListPlus /> New task</Button>} />
      ) : (
        <TaskBoard tasks={tasks} snap={snap} onChanged={() => void refresh()} />
      )}
      <TaskDialog key={zone} open={open} onClose={() => setOpen(false)} snap={snap} defaultZone={zone === ALL ? undefined : zone} createdBy={me?.id ?? null} onCreated={() => void refresh()} />
    </div>
  );
}
