"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  FREQUENCIES,
  HABIT_COLORS,
  HABIT_COLOR_HEX,
  HABIT_ICONS,
  type Frequency,
  type HabitColor,
} from "@/features/habits/schema";
import { createHabit } from "@/features/habits/server/actions";

const formSchema = z.object({
  name: z.string().min(1, "Required").max(80),
  description: z.string().max(200).optional(),
  icon: z.string(),
  color: z.enum(HABIT_COLORS),
  frequency: z.enum(FREQUENCIES),
});
type FormValues = z.infer<typeof formSchema>;

export function AddHabitDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      icon: "🌱",
      color: "purple",
      frequency: "DAILY",
    },
    resolver: zodResolver(formSchema),
  });

  const icon = watch("icon");
  const color = watch("color");
  const frequency = watch("frequency");

  function onSubmit(v: FormValues) {
    start(async () => {
      await createHabit({
        name: v.name.trim(),
        description: v.description?.trim() || null,
        icon: v.icon,
        color: v.color,
        frequency: v.frequency,
        targetPerWeek: null,
      });
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-primary-soft"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add Habit
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a new habit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <Field label="Name" error={errors.name?.message}>
            <Input
              autoFocus
              placeholder="Morning Exercise"
              {...register("name")}
            />
          </Field>

          <Field label="Description (optional)">
            <Input
              placeholder="30 mins workout"
              {...register("description")}
            />
          </Field>

          <Field label="Icon">
            <div className="flex flex-wrap gap-1.5">
              {HABIT_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setValue("icon", i, { shouldDirty: true })}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md border text-lg transition-colors",
                    icon === i
                      ? "border-primary bg-primary/15"
                      : "border-border hover:bg-primary/10",
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Color">
            <div className="flex gap-1.5">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("color", c, { shouldDirty: true })}
                  aria-label={c}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === c
                      ? "scale-110 border-foreground"
                      : "border-transparent",
                  )}
                  style={{ background: HABIT_COLOR_HEX[c as HabitColor] }}
                />
              ))}
            </div>
          </Field>

          <Field label="Schedule">
            <div className="flex gap-2">
              {(
                [
                  { v: "DAILY", label: "Daily" },
                  { v: "WEEKLY", label: "Weekly" },
                  { v: "CUSTOM", label: "Custom" },
                ] as { v: Frequency; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() =>
                    setValue("frequency", opt.v, { shouldDirty: true })
                  }
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-[12.5px] font-medium transition-colors",
                    frequency === opt.v
                      ? "border-primary bg-primary/15 text-primary-soft"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-primary-soft disabled:opacity-60"
            >
              {pending ? "Saving…" : "Add habit"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] text-muted-foreground">{label}</Label>
      {children}
      {error ? <div className="text-[11px] text-kpi-red">{error}</div> : null}
    </div>
  );
}
