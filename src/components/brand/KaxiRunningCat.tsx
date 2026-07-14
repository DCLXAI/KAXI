import { KaxiCat } from "@/components/brand/KaxiCat";
import { cn } from "@/lib/utils";

export function KaxiRunningCat({
  size = 52,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span data-kaxi-running-cat="stationary" className={cn("inline-flex items-end", className)}>
      <KaxiCat state="running" size={size} fps={10} className="shrink-0" />
    </span>
  );
}
