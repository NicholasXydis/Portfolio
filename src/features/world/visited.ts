import { useSyncExternalStore } from "react";
import { PLACES, type Place } from "./types";

const VISITED_KEY = "koi-visited";

let memory: Place[] = [];
const listeners = new Set<() => void>();
let cache: readonly Place[] = [];

function read(): Place[] {
  try {
    const raw = window.localStorage.getItem(VISITED_KEY);
    const list: unknown = raw ? JSON.parse(raw) : memory;
    return Array.isArray(list) ? PLACES.filter((p) => list.includes(p)) : [];
  } catch {
    return PLACES.filter((p) => memory.includes(p));
  }
}

export function getVisited(): readonly Place[] {
  const next = read();
  if (next.length !== cache.length || next.some((p, i) => p !== cache[i]))
    cache = next;
  return cache;
}

export function markVisited(place: Place): void {
  const now = read();
  if (now.includes(place)) return;
  const next = PLACES.filter((p) => p === place || now.includes(p));
  memory = next;
  persist(next);
  listeners.forEach((fn) => fn());
}

function persist(places: readonly Place[]): void {
  try {
    window.localStorage.setItem(VISITED_KEY, JSON.stringify(places));
  } catch {
    return;
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useVisited(): readonly Place[] {
  return useSyncExternalStore(subscribe, getVisited, () => cache);
}

export function resetVisitedForTest(): void {
  memory = [];
  cache = [];
  try {
    window.localStorage.removeItem(VISITED_KEY);
  } catch {
    return;
  }
}
