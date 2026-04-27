import { PageHeader } from "@/components/page-header";
import { SidebarBottomSlot } from "@/lib/sidebar-slot";
import { HelpContent } from "@/features/help/components/help-content";
import { SupportRail } from "@/features/help/components/support-rail";
import { HereToHelpCard } from "@/features/help/components/here-to-help-card";

// /help has no per-user state, no auth checks, no DB queries — it's the same
// HTML for everyone. Force-static prerenders it at build and serves from the
// CDN edge instead of running the Node renderer per request.
export const dynamic = "force-static";

export default function HelpPage() {
  return (
    <div className="flex h-screen flex-col">
      <SidebarBottomSlot>
        <HereToHelpCard />
      </SidebarBottomSlot>

      <PageHeader
        title="Help & Support"
        subtitle="How can we help you today?"
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2 lg:px-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <HelpContent />
          <SupportRail />
        </div>
      </div>
    </div>
  );
}
