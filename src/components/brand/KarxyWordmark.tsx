import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

type KarxyWordmarkProps = Omit<
  ImageProps,
  "src" | "alt" | "width" | "height"
> & {
  "aria-label"?: string;
};

/** Shared KARXY bubble wordmark used across public, account, and admin surfaces. */
export function KarxyWordmark({
  className,
  "aria-label": ariaLabel,
  sizes = "10rem",
  ...props
}: KarxyWordmarkProps) {
  return (
    <Image
      src="/brand/karxy-bubble-wordmark.png"
      alt={ariaLabel ?? ""}
      width={1661}
      height={482}
      sizes={sizes}
      className={cn("h-auto shrink-0 object-contain", className)}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      data-kaxi-mark="wordmark"
      {...props}
    />
  );
}
