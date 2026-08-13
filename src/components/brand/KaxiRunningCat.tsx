import Image from "next/image";

import { cn } from "@/lib/utils";

export function KaxiRunningCat({
  size = 52,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span data-karxy-mascot="trio" className={cn("inline-flex items-end", className)}>
      <Image
        src="/mascot/karxy-mascot-trio.png"
        alt=""
        aria-hidden
        width={1774}
        height={887}
        sizes={`${size * 2}px`}
        loading="eager"
        className="h-auto shrink-0 object-contain"
        style={{ width: size * 2, height: size }}
      />
    </span>
  );
}
