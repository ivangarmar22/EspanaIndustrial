"use client";

/**
 * Saved and visited places, stored only in this browser (localStorage).
 * Nothing is sent to any server. The interface is kept small so it can be
 * backed by an account-based API later without touching the components.
 */
import { useSyncExternalStore } from "react";

export interface SavedPlace {
  id: string;
  slug: string;
  name: string;
  savedAt: string;
}

interface State {
  saved: SavedPlace[];
  visited: string[];
}

const KEY = "ei:places:v1";
const EMPTY: State = { saved: [], visited: [] };
const listeners = new Set<() => void>();
let snapshot: State | undefined;

function read(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<State>) : {};
    return {
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      visited: Array.isArray(parsed.visited) ? parsed.visited : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(next: State) {
  snapshot = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage disabled: keep the in-memory state for this session.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => (snapshot ??= read());
const getServerSnapshot = () => EMPTY;

export function usePlaces() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    ...state,
    isSaved: (id: string) => state.saved.some((p) => p.id === id),
    isVisited: (id: string) => state.visited.includes(id),
    toggleSaved: (place: Omit<SavedPlace, "savedAt">) => {
      const cur = getSnapshot();
      const exists = cur.saved.some((p) => p.id === place.id);
      write({
        ...cur,
        saved: exists
          ? cur.saved.filter((p) => p.id !== place.id)
          : [...cur.saved, { ...place, savedAt: new Date().toISOString() }],
      });
    },
    toggleVisited: (id: string) => {
      const cur = getSnapshot();
      write({ ...cur, visited: cur.visited.includes(id) ? cur.visited.filter((v) => v !== id) : [...cur.visited, id] });
    },
    clearAll: () => write(EMPTY),
  };
}
