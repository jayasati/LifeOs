import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { PersistentTopRight } from "@/components/persistent-top-right";
import { SidebarSlotProvider } from "@/lib/sidebar-slot";
import { TimerProvider } from "@/features/timer/components/timer-provider";
import { TaskPickerProvider } from "@/features/timer/components/task-picker-context";
import { TaskPickerDialog } from "@/features/timer/components/task-picker-dialog";

// Auth gating happens in proxy.ts (Clerk middleware). This layout intentionally
// does NOT call auth() so it can stay static across navigations and avoid a
// round-trip on every click.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarSlotProvider>
      <TaskPickerProvider>
        <TimerProvider />
        <TaskPickerDialog />
        <Toaster richColors theme="dark" />
        <div className="grid min-h-screen grid-cols-1 bg-background md:grid-cols-[210px_minmax(0,1fr)]">
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <main className="relative min-w-0 overflow-x-hidden">
            <MobileNav />
            <PersistentTopRight />
            {children}
          </main>
        </div>
      </TaskPickerProvider>
    </SidebarSlotProvider>
  );
}
