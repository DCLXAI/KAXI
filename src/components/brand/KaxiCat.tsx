"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type KaxiCatState =
  | "running" | "breath" | "stretch" | "yawn" | "nap" | "napz" | "happy";

const FRAMES: Record<KaxiCatState, string[]> = {
  running: [0, 1, 2, 3, 4].map((i) => `/mascot/cat_running_${i}.png`),
  breath: [0, 1].map((i) => `/mascot/pet_breath_${i}.png`),
  stretch: [0, 1].map((i) => `/mascot/pet_stretch_${i}.png`),
  yawn: [0, 1].map((i) => `/mascot/pet_yawn_${i}.png`),
  nap: [0, 1].map((i) => `/mascot/pet_nap_${i}.png`),
  napz: [0, 1, 2].map((i) => `/mascot/pet_nap_z_${i}.png`),
  happy: [0, 1].map((i) => `/mascot/pet_happy_${i}.png`),
};

const DEFAULT_FPS: Record<KaxiCatState, number> = {
  running: 10, breath: 2, stretch: 3, yawn: 3, nap: 2, napz: 2, happy: 4,
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function KaxiCat({
  state = "breath",
  size = 48,
  inverted = false,
  fps,
  className,
  label,
}: {
  state?: KaxiCatState;
  size?: number;
  /** 다크(chat) 표면에서 true — 검은 고양이를 흰색으로 반전 */
  inverted?: boolean;
  fps?: number;
  className?: string;
  /** 접근성 라벨. 없으면 장식 요소로 처리(aria-hidden) */
  label?: string;
}) {
  const frames = FRAMES[state];
  const [prevState, setPrevState] = useState(state);
  const [frame, setFrame] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // state가 바뀌면 프레임을 0으로 리셋 (렌더 중 조정 — effect 내 setState 대신 React 권장 패턴)
  if (state !== prevState) {
    setPrevState(state);
    setFrame(0);
  }

  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  // 뷰포트 내 + 탭 활성 상태일 때만 true — 오프스크린/탭 숨김 시 인터벌 정지
  const [active, setActive] = useState(true);
  const inViewportRef = useRef(true);
  const tabVisibleRef = useRef(true);

  // prefers-reduced-motion 변경 감지
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // 오프스크린 pause/재개
  useEffect(() => {
    const el = imgRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewportRef.current = entry.isIntersecting;
        setActive(inViewportRef.current && tabVisibleRef.current);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 탭 숨김 pause/재개
  useEffect(() => {
    if (typeof document === "undefined") return;
    tabVisibleRef.current = !document.hidden;
    const onVisibilityChange = () => {
      tabVisibleRef.current = !document.hidden;
      setActive(inViewportRef.current && tabVisibleRef.current);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || !active) return;
    const ms = 1000 / (fps ?? DEFAULT_FPS[state]);
    const id = setInterval(() => setFrame((v) => (v + 1) % frames.length), ms);
    return () => clearInterval(id);
  }, [state, fps, frames.length, reducedMotion, active]);

  return (
    // 픽셀아트 프레임: next/image 최적화 불필요, pixelated 유지
    <img
      ref={imgRef}
      src={frames[frame]}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      height={size}
      className={cn("select-none", className)}
      style={{ height: size, width: "auto", imageRendering: "pixelated",
               filter: inverted ? "invert(1)" : undefined }}
      draggable={false}
    />
  );
}
