export function ConsistencyCard({ percent }: { percent: number }) {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const dash = (Math.min(100, percent) / 100) * circ;

  return (
    <div className="rounded-[14px] border border-border bg-daily-progress p-[14px] text-center">
      <div className="text-[13px] font-bold leading-tight">Consistency is</div>
      <div className="text-[13px] font-bold leading-tight">the key! 🗝️</div>

      <div className="relative mx-auto mt-3 h-[110px] w-[110px]">
        <svg viewBox="0 0 110 110" className="absolute inset-0 -rotate-90">
          <circle
            cx="55"
            cy="55"
            r={radius}
            fill="none"
            stroke="hsl(var(--primary) / 0.15)"
            strokeWidth="9"
          />
          <defs>
            <linearGradient id="consGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary-soft))" />
            </linearGradient>
          </defs>
          <circle
            cx="55"
            cy="55"
            r={radius}
            fill="none"
            stroke="url(#consGrad)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[22px] font-bold leading-none">{percent}%</div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Weekly Progress
          </div>
        </div>
      </div>

      <svg
        viewBox="0 0 160 32"
        preserveAspectRatio="none"
        className="mt-2 h-8 w-full"
      >
        <defs>
          <linearGradient id="consWave" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0.5"
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0.05"
            />
          </linearGradient>
        </defs>
        <path
          d="M0 20 C20 10 40 28 60 18 S100 8 120 16 S150 22 160 14 L160 32 L0 32 Z"
          fill="url(#consWave)"
        />
        <path
          d="M0 24 C20 16 40 30 60 22 S100 12 120 20 S150 26 160 18"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
