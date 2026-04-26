import Link from "next/link";
import { BarChart3 } from "lucide-react";

export function ViewAnalyticsButton() {
  return (
    <Link
      href="/analytics"
      className="flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-primary/40 px-3 py-2.5 text-[12.5px] font-semibold text-primary-soft transition-colors hover:bg-primary/15"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(124,92,246,0.3), rgba(124,92,246,0.15))",
      }}
    >
      <BarChart3 className="h-3.5 w-3.5" />
      View Habit Analytics
    </Link>
  );
}
