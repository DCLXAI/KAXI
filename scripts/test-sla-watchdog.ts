import assert from "node:assert/strict";
import { classifySlaItem } from "../src/lib/ops/sla-watchdog";

const now = new Date("2026-07-16T12:00:00.000Z");
const iso = (offsetMinutes: number) => new Date(now.getTime() + offsetMinutes * 60_000).toISOString();

// Terminal items are never alerted, however overdue.
assert.equal(classifySlaItem({ dueAt: iso(-9999), minutes: 1440, terminal: true, now }), "skipped");
// Already answered (first response recorded) -> not breached.
assert.equal(classifySlaItem({ dueAt: iso(-60), minutes: 1440, firstResponseAt: iso(-120), terminal: false, now }), "skipped");
// No due date -> nothing to judge.
assert.equal(classifySlaItem({ dueAt: null, minutes: 1440, terminal: false, now }), "skipped");
// Past due, unanswered, active -> breached.
assert.equal(classifySlaItem({ dueAt: iso(-1), minutes: 1440, terminal: false, now }), "breached");
// Within the final 25% of the window -> approaching.
assert.equal(classifySlaItem({ dueAt: iso(60), minutes: 1440, terminal: false, now }), "approaching");
// 25% boundary is inclusive of "approaching".
assert.equal(classifySlaItem({ dueAt: iso(360), minutes: 1440, terminal: false, now }), "approaching");
// Comfortably inside the window -> healthy.
assert.equal(classifySlaItem({ dueAt: iso(600), minutes: 1440, terminal: false, now }), "healthy");
// Urgent tier uses its own window: 25% of 120min = 30min.
assert.equal(classifySlaItem({ dueAt: iso(20), minutes: 120, terminal: false, now }), "approaching");
assert.equal(classifySlaItem({ dueAt: iso(60), minutes: 120, terminal: false, now }), "healthy");

console.log("PASS sla watchdog: breach/approach/healthy classification");
