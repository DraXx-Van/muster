'use client';
import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CircleDot, Inbox, Loader } from 'lucide-react';
import { toast } from 'sonner';
import type { Snapshot, Task, TaskStatus } from '@/lib/types';
import { updateTaskStatus } from '@/lib/db/queries';
import { cn } from '@/lib/utils';
import { PersonAvatar } from '@/components/common/kit';

const COLUMNS: { status: TaskStatus; title: string; icon: typeof Inbox; tone: string }[] = [
  { status: 'open', title: 'Open', icon: CircleDot, tone: 'text-info' },
  { status: 'in_progress', title: 'In progress', icon: Loader, tone: 'text-partial' },
  { status: 'resolved', title: 'Resolved', icon: CheckCircle2, tone: 'text-covered' },
];
const PRIORITY: Record<Task['priority'], string> = { high: 'bg-gap/15 text-gap', medium: 'bg-partial/15 text-partial', low: 'bg-muted text-muted-foreground' };

function CardBody({ task, snap, lifted }: { task: Task; snap: Snapshot; lifted?: boolean }) {
  const zone = snap.zones.find((z) => z.id === task.zone_id);
  const who = snap.volunteers.find((v) => v.id === task.assignee_id);
  return (
    <div className={cn('rounded-lg border bg-card p-3 text-left shadow-sm', lifted && 'rotate-1 border-primary/60 shadow-xl shadow-black/40')}>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
      <div className="mt-2.5 flex items-center gap-2">
        {zone && <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground"><span className="size-1.5 rounded-full" style={{ background: zone.color }} />{zone.name}</span>}
        <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize', PRIORITY[task.priority])}>{task.priority}</span>
        <span className="ml-auto">{who ? <span title={who.name}><PersonAvatar name={who.name} size="sm" /></span> : <span className="text-[11px] text-muted-foreground">Unassigned</span>}</span>
      </div>
    </div>
  );
}

function DraggableCard({ task, snap }: { task: Task; snap: Snapshot }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <motion.div ref={setNodeRef} layout layoutId={task.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: isDragging ? 0.35 : 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }} className="cursor-grab touch-none active:cursor-grabbing" {...attributes} {...listeners}>
      <CardBody task={task} snap={snap} />
    </motion.div>
  );
}

function Column({ status, title, icon: Icon, tone, tasks, snap }: (typeof COLUMNS)[number] & { tasks: Task[]; snap: Snapshot }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={cn('flex min-h-64 flex-col rounded-xl border bg-muted/20 p-2.5 transition-colors', isOver && 'border-primary/50 bg-primary/5')}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <Icon className={cn('size-4', tone)} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="ml-auto rounded-full bg-muted px-2 text-xs tabular text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <AnimatePresence initial={false}>
          {tasks.map((t) => <DraggableCard key={t.id} task={t} snap={snap} />)}
        </AnimatePresence>
        {tasks.length === 0 && <p className="m-auto py-8 text-center text-xs text-muted-foreground">Drop a task here</p>}
      </div>
    </div>
  );
}

/** Kanban with drag and drop (dnd-kit). Status changes are optimistic and synced live to every browser. */
export function TaskBoard({ tasks, snap, onChanged }: { tasks: Task[]; snap: Snapshot; onChanged: () => void }) {
  const [override, setOverride] = useState<Record<string, TaskStatus>>({});
  const [active, setActive] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );
  const shown = tasks.map((t) => ({ ...t, status: override[t.id] ?? t.status }));

  const onStart = (e: DragStartEvent) => setActive(shown.find((t) => t.id === e.active.id) ?? null);
  const onEnd = async (e: DragEndEvent) => {
    setActive(null);
    const to = e.over?.id as TaskStatus | undefined;
    const task = shown.find((t) => t.id === e.active.id);
    if (!to || !task || task.status === to) return;
    setOverride((o) => ({ ...o, [task.id]: to }));
    try {
      await updateTaskStatus(task.id, to);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not move the task');
    } finally {
      setOverride((o) => { const { [task.id]: _drop, ...rest } = o; void _drop; return rest; });
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
      <div className="grid gap-3 md:grid-cols-3">
        {COLUMNS.map((c) => <Column key={c.status} {...c} tasks={shown.filter((t) => t.status === c.status)} snap={snap} />)}
      </div>
      <DragOverlay dropAnimation={{ duration: 180 }}>{active ? <CardBody task={active} snap={snap} lifted /> : null}</DragOverlay>
    </DndContext>
  );
}
