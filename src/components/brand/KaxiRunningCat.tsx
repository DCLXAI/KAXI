import { KaxiCat } from "@/components/brand/KaxiCat";
import { cn } from "@/lib/utils";

export function KaxiRunningCat({
  travel = false,
  white = false,
  size = 52,
  className,
}: {
  travel?: boolean;
  white?: boolean;
  size?: number;
  className?: string;
}) {
  const cat = (
    <KaxiCat
      state="running"
      size={size}
      inverted={white}
      fps={10}
      className="shrink-0"
    />
  );

  if (!travel) {
    return (
      <span data-kaxi-running-cat="stationary" className={cn("inline-flex items-end", className)}>
        {cat}
      </span>
    );
  }

  return (
    <div
      data-testid="home-kaxi-runner"
      data-kaxi-running-cat="travel"
      aria-hidden="true"
      className={cn("relative mx-auto mt-5 h-16 w-full max-w-[420px] overflow-hidden", className)}
    >
      <span className="kaxi-cat-travel absolute bottom-0 inline-flex" style={{ width: size * 1.2 }}>
        {cat}
      </span>
    </div>
  );
}
