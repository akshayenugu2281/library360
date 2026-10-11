import { useEffect, useState } from "react";

/** Ticking clock for live countdowns; single interval per mounted component. */
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** "11h 24m left" / "2d 3h left" / "Expired 2h ago" for pickup deadlines. */
export function formatCountdown(targetIso: string, nowMs: number): string {
  const diff = new Date(targetIso).getTime() - nowMs;
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const rest = days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
  return diff >= 0 ? `${rest} left` : `Expired ${rest} ago`;
}

/** "Due in 5 days" / "Due tomorrow" / "Due today" / "3 days overdue" for loans. */
export function dueLabel(dueIso: string, nowMs: number): { text: string; overdue: boolean; urgent: boolean } {
  const startOf = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const diffDays = Math.round((startOf(new Date(dueIso).getTime()) - startOf(nowMs)) / 86400000);
  if (diffDays < 0) return { text: `${-diffDays} day${-diffDays === 1 ? "" : "s"} overdue`, overdue: true, urgent: true };
  if (diffDays === 0) return { text: "Due today", overdue: false, urgent: true };
  if (diffDays === 1) return { text: "Due tomorrow", overdue: false, urgent: true };
  return { text: `Due in ${diffDays} days`, overdue: false, urgent: diffDays <= 3 };
}

/** Privacy-safe human estimate label; always framed as an estimate, never a promise. */
export function estimateLabel(iso: string | undefined | null, nowMs: number): string {
  if (!iso) return "Estimate unavailable";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Estimate unavailable";
  if (t <= nowMs + 60000) return "Available now";
  const days = Math.ceil((t - nowMs) / 86400000);
  if (days <= 1) return "Estimated today*";
  if (days <= 14) return `Estimated in ${days} days*`;
  return `Estimated ${new Date(t).toLocaleDateString()}*`;
}
