"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Repeat,
  BookOpen,
  Timer,
  Target,
  BarChart3,
  Plug,
  Settings,
  HelpCircle,
  Zap,
  Menu,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const topItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/habits", label: "Habits", icon: Repeat },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/timer", label: "Timer", icon: Timer },
];

const bottomItems: NavItem[] = [
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Open navigation"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-primary/15"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[260px] bg-sidebar p-0 sm:max-w-[260px]"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center gap-2.5 px-[18px] pb-6 pt-5">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-primary">
              <Zap className="h-[18px] w-[18px] fill-white text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-bold text-foreground">
                FocusFlow
              </div>
              <div className="text-[10px] text-muted-foreground-strong">
                Focus. Track. Achieve.
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto pb-6">
            {topItems.map((item) => (
              <NavRow key={item.href} item={item} pathname={pathname} />
            ))}

            <div className="px-[18px] pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground-strong">
              Productivity
            </div>

            {bottomItems.map((item) => (
              <NavRow key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary">
          <Zap className="h-4 w-4 fill-white text-white" />
        </div>
        <span className="text-sm font-bold text-foreground">FocusFlow</span>
      </Link>

      <UserButton
        appearance={{ elements: { userButtonAvatarBox: "h-8 w-8" } }}
      />
    </header>
  );
}

function NavRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const { href, label, icon: Icon } = item;
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex items-center gap-2.5 px-[18px] py-[10px] text-[14px] font-medium transition-colors",
        isActive
          ? "border-l-[3px] border-primary bg-primary/15 pl-[15px] text-primary-soft"
          : "border-l-[3px] border-transparent text-muted-foreground hover:bg-primary/15 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
