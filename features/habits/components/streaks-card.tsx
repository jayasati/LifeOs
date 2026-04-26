export function StreaksCard({
  current,
  best,
}: {
  current: number;
  best: number;
}) {
  const denom = Math.max(best, 7);
  const pct = Math.min(1, current / denom);
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const dash = pct * circ;

  return (
    <div className="rounded-[14px] border border-border bg-card p-[14px]">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13.5px] font-bold">
          🔥 Streaks
        </div>
        <span className="text-[11.5px] text-primary-soft">View all</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative h-[80px] w-[80px] shrink-0">
          <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="rgba(245,158,11,0.15)"
              strokeWidth="7"
            />
            <defs>
              <linearGradient id="streakGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="url(#streakGrad)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ - dash}`}
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[22px] font-extrabold leading-none">
              {current}
            </div>
            <div className="text-[9px] text-muted-foreground-strong">Days</div>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div>
            <div className="text-[11px] text-muted-foreground">Current Streak</div>
            <div className="mt-0.5 text-[13px] font-bold">Keep it up! 💪</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Best Streak</div>
            <div className="mt-0.5 text-[13.5px] font-bold">{best} Days</div>
          </div>
        </div>
      </div>
    </div>
  );
}
