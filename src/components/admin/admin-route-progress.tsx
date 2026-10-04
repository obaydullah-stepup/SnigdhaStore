"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const SHOW_DELAY = 80;
const REVEAL_MS = 220;
const FINISH_MS = 200;
const FADE_MS = 300;
const FAILSAFE_MS = 15000;

type Phase = "idle" | "revealing" | "loading" | "finishing" | "fading";

const PHASE_CLASSES: Record<Phase, string> = {
  idle: "w-0 opacity-0 transition-none",
  revealing: "w-1/4 opacity-100 transition-[width] duration-200 ease-out",
  loading: "w-[85%] opacity-100 transition-[width] duration-[6000ms] ease-out",
  finishing: "w-full opacity-100 transition-[width] duration-200 ease-out",
  fading: "w-full opacity-0 transition-opacity duration-300 ease-out",
};

export function AdminRouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");

  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);
  const frame = useRef<number | null>(null);

  const route = `${pathname}?${searchParams.toString()}`;

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }, []);

  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    if (phaseRef.current !== "revealing" && phaseRef.current !== "loading") return;
    setPhaseSafe("finishing");
    timers.current.push(
      window.setTimeout(() => setPhaseSafe("fading"), FINISH_MS + 20),
      window.setTimeout(() => setPhaseSafe("idle"), FINISH_MS + FADE_MS + 60)
    );
  }, [clearTimers, setPhaseSafe]);

  const start = useCallback(() => {
    clearTimers();
    if (phaseRef.current === "revealing" || phaseRef.current === "loading") return;
    setPhaseSafe("idle");
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      timers.current.push(
        window.setTimeout(() => {
          setPhaseSafe("revealing");
          timers.current.push(
            window.setTimeout(() => {
              setPhaseSafe("loading");
              timers.current.push(window.setTimeout(finish, FAILSAFE_MS));
            }, REVEAL_MS)
          );
        }, SHOW_DELAY)
      );
    });
  }, [clearTimers, finish, setPhaseSafe]);

  useEffect(() => {
    finish();
  }, [route, finish]);

  useEffect(() => {
    const isModified = (event: MouseEvent) =>
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;

    const onClick = (event: MouseEvent) => {
      if (isModified(event)) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      clearTimers();
    };
  }, [start, clearTimers]);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
      >
        <div className={cn("bg-primary h-full", PHASE_CLASSES[phase])} />
      </div>
      <span role="status" className="sr-only">
        {phase === "idle" ? null : "Loading page"}
      </span>
    </>
  );
}
