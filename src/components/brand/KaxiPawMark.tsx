import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export function KaxiPawMark({
  className,
  "aria-label": ariaLabel,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 text-icon-accent", className)}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      role={ariaLabel ? "img" : undefined}
      data-kaxi-mark="paw"
      {...props}
    >
      <ellipse cx="5.3" cy="9.2" rx="2.05" ry="3.05" transform="rotate(-28 5.3 9.2)" fill="currentColor" />
      <ellipse cx="9.7" cy="5.9" rx="2.15" ry="3.2" transform="rotate(-8 9.7 5.9)" fill="currentColor" />
      <ellipse cx="14.7" cy="5.9" rx="2.1" ry="3.05" transform="rotate(9 14.7 5.9)" fill="currentColor" />
      <ellipse cx="18.8" cy="9.5" rx="1.95" ry="2.85" transform="rotate(27 18.8 9.5)" fill="currentColor" />
      <path
        d="M5.1 17.1c0-2.1 1.55-3.25 3.05-4.6 1.35-1.22 2.2-2.7 4.05-2.7 1.9 0 2.8 1.45 4.15 2.72 1.48 1.39 3.05 2.55 3.05 4.62 0 2.35-2.02 3.75-4.22 3.56-1.25-.1-1.85-.67-3-.67-1.2 0-1.9.6-3.18.7-2.15.17-3.9-1.25-3.9-3.63Z"
        fill="currentColor"
      />
    </svg>
  );
}
