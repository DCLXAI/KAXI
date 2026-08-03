import Image from "next/image";

import { cn } from "@/lib/utils";

export type KaxiCatState =
  | "running" | "breath" | "stretch" | "yawn" | "nap" | "napz" | "happy";

const MASCOTS: Record<KaxiCatState, {
  src: string;
  width: number;
  height: number;
  motion?: string;
}> = {
  running: {
    src: "/mascot/karxy-mascot-guide.png",
    width: 441,
    height: 591,
    motion: "animate-bounce motion-reduce:animate-none",
  },
  breath: { src: "/mascot/karxy-mascot-verify.png", width: 415, height: 548 },
  stretch: { src: "/mascot/karxy-mascot-welcome.png", width: 487, height: 542 },
  yawn: { src: "/mascot/karxy-mascot-verify.png", width: 415, height: 548 },
  nap: { src: "/mascot/karxy-mascot-guide.png", width: 441, height: 591 },
  napz: { src: "/mascot/karxy-mascot-verify.png", width: 415, height: 548 },
  happy: {
    src: "/mascot/karxy-mascot-welcome.png",
    width: 487,
    height: 542,
    motion: "animate-pulse motion-reduce:animate-none",
  },
};

/**
 * Compatibility wrapper for the previous sprite API. Every state now renders
 * one of KARXY's original guide, verifier, or welcome mascots.
 */
export function KaxiCat({
  state = "breath",
  size = 48,
  inverted = false,
  className,
  label,
}: {
  state?: KaxiCatState;
  size?: number;
  inverted?: boolean;
  fps?: number;
  className?: string;
  label?: string;
}) {
  const mascot = MASCOTS[state];

  return (
    <Image
      src={mascot.src}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={mascot.width}
      height={mascot.height}
      sizes={`${size}px`}
      className={cn("select-none object-contain", mascot.motion, className)}
      style={{
        width: "auto",
        height: size,
        filter: inverted
          ? "drop-shadow(0 0 1px rgba(255,255,255,.7)) drop-shadow(0 2px 2px rgba(0,0,0,.45))"
          : undefined,
      }}
      draggable={false}
    />
  );
}
