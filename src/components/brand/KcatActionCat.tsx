"use client";

import { useEffect, useState } from "react";
import animationManifest from "../../../public/mascot/pet-actions/pet_animations.json";
import { cn } from "@/lib/utils";

export type KcatClipId =
  | "stretch"
  | "groom"
  | "yawn"
  | "lookAround"
  | "sleepEnter"
  | "sleepLoop"
  | "sleepExit"
  | "eat";

type Clip = {
  id: KcatClipId;
  prefix: string;
  frameDurationsMs: number[];
  loop: "once" | "repeat";
};

const clips = new Map(
  (animationManifest.clips as Clip[]).map((clip) => [clip.id, clip]),
);

export function KcatActionCat({
  clip: clipId,
  size = 56,
  pauseMs = 1400,
  flip = false,
  className,
  label,
}: {
  clip: KcatClipId;
  size?: number;
  pauseMs?: number;
  flip?: boolean;
  className?: string;
  label?: string;
}) {
  const clip = clips.get(clipId);
  const [frame, setFrame] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  if (!clip) {
    throw new Error(`Unknown KCAT animation clip: ${clipId}`);
  }

  const frameCount = clip.frameDurationsMs.length;
  const visibleFrame = frame % frameCount;
  const frameFile = `${clip.prefix}${String(visibleFrame).padStart(2, "0")}.png`;
  const frameSrc = `/mascot/pet-actions/${frameFile}`;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    for (let index = 0; index < frameCount; index += 1) {
      const image = new Image();
      image.src = `/mascot/pet-actions/${clip.prefix}${String(index).padStart(2, "0")}.png`;
    }
  }, [clip.prefix, frameCount]);

  useEffect(() => {
    if (reduceMotion) return;

    const isLastFrame = visibleFrame === frameCount - 1;
    const rest = isLastFrame && clip.loop === "once" ? pauseMs : 0;
    const timeout = window.setTimeout(
      () => setFrame((current) => (current + 1) % frameCount),
      clip.frameDurationsMs[visibleFrame] + rest,
    );
    return () => window.clearTimeout(timeout);
  }, [clip, frameCount, pauseMs, reduceMotion, visibleFrame]);

  return (
    <span
      data-kcat-action-cat={clipId}
      className={cn("inline-flex shrink-0 items-end justify-center", className)}
      style={{ width: size * 1.2, height: size }}
    >
      <img
        src={frameSrc}
        alt={label ?? ""}
        aria-hidden={label ? undefined : true}
        draggable={false}
        className="h-full w-full select-none object-contain object-bottom"
        style={{
          imageRendering: "pixelated",
          transform: flip ? "scaleX(-1)" : undefined,
        }}
      />
    </span>
  );
}
