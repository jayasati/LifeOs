import {
  type DashRange,
  getDashboardProductivity,
} from "@/features/dashboard/server/queries";
import { ProductivityChart } from "@/features/charts/lazy";
import { ProductivityRangeTabs } from "@/features/dashboard/components/productivity-range-tabs";

export async function ProductivityCard({ range }: { range: DashRange }) {
  const data = await getDashboardProductivity(range);
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold">Productivity Overview</h3>
        <ProductivityRangeTabs active={range} />
      </div>
      <ProductivityChart data={data} />
    </div>
  );
}
