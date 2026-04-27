import Link from "next/link";
import Image from "next/image";
import {
  Zap,
  Sparkles,
  ArrowRight,
  Play,
  CheckSquare,
  Repeat,
  Timer,
  BarChart3,
  Plug,
  Star,
} from "lucide-react";

// Marketing landing page — same HTML for everyone who isn't logged in.
// Logged-in users get redirected by middleware (proxy.ts) so we never reach
// this component. force-static lets Next prerender it at build and serve
// from the CDN.
export const dynamic = "force-static";

export default function HeroPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* subtle ambient glow — kept light to avoid AI-template look */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[120px]" />

      {/* TOP NAV */}
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary">
            <Zap className="h-[18px] w-[18px] fill-white text-white" />
          </div>
          <span className="text-[16px] font-bold">FocusFlow</span>
        </Link>

        <div className="hidden items-center gap-8 text-[13.5px] text-muted-foreground md:flex">
          <Link href="#features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#how" className="transition-colors hover:text-foreground">
            How It Works
          </Link>
          <Link href="#integrations" className="transition-colors hover:text-foreground">
            Integrations
          </Link>
          <Link href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="#about" className="transition-colors hover:text-foreground">
            About
          </Link>
        </div>

        <div className="flex items-center gap-2 text-[13.5px]">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log In
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-[1.05fr_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11.5px] font-medium text-primary-soft">
            <Sparkles className="h-3 w-3" />
            Boost Productivity. Supercharged.
          </div>

          <h1 className="mt-5 text-[56px] font-bold leading-[1.05] tracking-tight md:text-[64px]">
            <span className="block">Plan Better.</span>
            <span className="block">Focus Deeper.</span>
            <span className="block text-gradient-violet">Achieve More.</span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            FocusFlow is your all-in-one productivity OS to manage tasks, build habits,
            track time, and analyze progress — all in one beautiful dashboard.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Start Your Journey
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-card/80"
            >
              <Play className="h-4 w-4" />
              Watch Demo
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <AvatarPile />
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">
              Trusted by 10,000+ productive pros
            </p>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="relative">
          <div className="absolute -inset-6 rounded-[24px] bg-primary/10 blur-[60px]" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            <Image
              src="/mockups/dashboard.png"
              alt="FocusFlow dashboard preview"
              width={1536}
              height={1024}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-[36px] font-bold tracking-tight md:text-[40px]">
            Everything you need to stay on track
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">
            Powerful features to help you plan, focus, and achieve your goals.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-5">
          <FeatureCard
            color="purple"
            icon={<CheckSquare className="h-5 w-5" />}
            title="Smart Task Management"
            description="Organize tasks, set priorities, and never miss a deadline."
          />
          <FeatureCard
            color="green"
            icon={<Repeat className="h-5 w-5" />}
            title="Habit Tracking"
            description="Build lasting habits, monitor streaks, and grow consistently."
          />
          <FeatureCard
            color="orange"
            icon={<Timer className="h-5 w-5" />}
            title="Focus Timer"
            description="Use Pomodoro to maximize focus and avoid burnout."
          />
          <FeatureCard
            color="blue"
            icon={<BarChart3 className="h-5 w-5" />}
            title="Advanced Analytics"
            description="Visualize your progress and improve every day."
          />
          <FeatureCard
            color="pink"
            icon={<Plug className="h-5 w-5" />}
            title="Powerful Integrations"
            description="Sync with GitHub and LeetCode in one click."
          />
        </div>
      </section>

      {/* MOCKUP GALLERY — horizontal snap-scroll, one big preview at a time */}
      <section id="how" className="relative py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11.5px] font-medium text-primary-soft">
            <Sparkles className="h-3 w-3" />
            Live Previews
          </div>
          <h2 className="mt-4 text-[36px] font-bold tracking-tight md:text-[40px]">
            Take a tour of every page
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">
            Scroll horizontally — every page is a real, fully-built screen.
          </p>
        </div>

        <div className="relative mt-12">
          {/* edge fades to hint scrollability */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />

          <div className="hide-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-[max(1.5rem,calc((100vw-72rem)/2))] pb-4">
            {GALLERY.map((m, i) => (
              <MockupSlide key={m.src} index={i + 1} total={GALLERY.length} {...m} />
            ))}
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-7xl items-center justify-center gap-2 px-6 text-[12px] text-muted-foreground-strong">
          <ArrowRight className="h-3.5 w-3.5 -scale-x-100" />
          <span>Drag, swipe, or use the scrollbar</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground-strong">
          Trusted by students, freelancers, entrepreneurs from
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-14 gap-y-6">
          {BRANDS.map((b) => (
            <span
              key={b.name}
              className={`text-[22px] font-bold tracking-tight ${b.className}`}
            >
              {b.name}
            </span>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-[12px] text-muted-foreground-strong">
          <span>© {new Date().getFullYear()} FocusFlow. Focus. Track. Achieve.</span>
          <div className="flex gap-5">
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const GALLERY = [
  {
    src: "/mockups/dashboard.png",
    name: "Dashboard",
    description: "Daily snapshot, KPIs and focus widgets",
  },
  {
    src: "/mockups/tasks.png",
    name: "Tasks",
    description: "Filters, calendar, priority, status, summary",
  },
  {
    src: "/mockups/habits.png",
    name: "Habits",
    description: "Weekly grid, streaks, calendar, insights",
  },
  {
    src: "/mockups/journal.png",
    name: "Journal",
    description: "Mood, photos, tags, search, calendar",
  },
  {
    src: "/mockups/timer.png",
    name: "Pomodoro Timer",
    description: "Focus, breaks, sessions, achievements",
  },
  {
    src: "/mockups/goals.png",
    name: "Goals",
    description: "Cards, progress, deadlines, streak heatmap",
  },
  {
    src: "/mockups/analytics.png",
    name: "Analytics",
    description: "Productivity score, charts, AI insights",
  },
  {
    src: "/mockups/integrations.png",
    name: "Integrations",
    description: "GitHub and LeetCode connectors",
  },
  {
    src: "/mockups/help.png",
    name: "Help & Support",
    description: "Search, guides, FAQs, contact, system status",
  },
];

function FeatureCard({
  color,
  icon,
  title,
  description,
}: {
  color: "purple" | "green" | "orange" | "blue" | "pink";
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  const colorMap: Record<typeof color, string> = {
    purple: "bg-primary/15 text-primary-soft",
    green: "bg-kpi-green/15 text-kpi-green",
    orange: "bg-kpi-orange/15 text-kpi-orange",
    blue: "bg-kpi-blue/15 text-kpi-blue",
    pink: "bg-pink-500/15 text-pink-400",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorMap[color]}`}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function MockupSlide({
  src,
  name,
  description,
  index,
  total,
}: {
  src: string;
  name: string;
  description: string;
  index: number;
  total: number;
}) {
  return (
    <div className="relative w-[min(820px,72vw)] flex-shrink-0 snap-center">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <Image
          src={src}
          alt={name}
          width={1536}
          height={1024}
          className="h-auto w-full"
        />
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div>
            <div className="text-[16px] font-semibold">{name}</div>
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">
              {description}
            </div>
          </div>
          <div className="text-[12px] tabular-nums text-muted-foreground-strong">
            {String(index).padStart(2, "0")}{" "}
            <span className="opacity-60">/ {String(total).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const BRANDS = [
  { name: "Google", className: "text-[#4285F4]" },
  { name: "Microsoft", className: "text-[#00A4EF]" },
  { name: "Amazon", className: "text-[#FF9900]" },
  { name: "Adobe", className: "text-[#FF0000]" },
  { name: "Spotify", className: "text-[#1DB954]" },
];

function AvatarPile() {
  const colors = [
    "bg-amber-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-sky-500",
  ];
  return (
    <div className="flex -space-x-2">
      {colors.map((c, i) => (
        <div
          key={i}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-white ${c}`}
        >
          {String.fromCharCode(65 + i)}
        </div>
      ))}
    </div>
  );
}
