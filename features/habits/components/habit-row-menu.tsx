"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveHabit } from "@/features/habits/server/actions";
import { AddHabitDialog } from "@/features/habits/components/add-habit-dialog";
import type { Frequency } from "@/features/habits/schema";

export function HabitRowMenu({
  habit,
}: {
  habit: {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    frequency: Frequency;
    targetPerWeek: number | null;
    customDays: number[];
  };
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [, start] = useTransition();

  function onDelete() {
    if (!confirm(`Delete habit "${habit.name}"? Logs are preserved but the habit will be hidden.`))
      return;
    start(async () => {
      await archiveHabit(habit.id);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground-strong transition-colors hover:bg-surface-2 hover:text-foreground"
          aria-label="Habit actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-kpi-red focus:text-kpi-red"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddHabitDialog
        mode="edit"
        initial={habit}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={null}
      />
    </>
  );
}
