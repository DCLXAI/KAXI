// DEAD CONFIG — Tailwind v4 loads all tokens from src/app/globals.css (@theme).
// This file is NOT read by the build: globals.css has no @config directive and
// PostCSS uses @tailwindcss/postcss (v4). The radius scale lives in @theme in
// globals.css; animations come from the tw-animate-css import there.
// Kept only so tooling (editor IntelliSense, shadcn CLI) does not get confused —
// do not add theme values here; they will have no effect.
import type { Config } from "tailwindcss";

const config: Config = { content: [], theme: {} };

export default config;
