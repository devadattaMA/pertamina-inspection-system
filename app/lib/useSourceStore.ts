"use client";

import { useCallback, useEffect, useState } from "react";
import type { SourceState } from "./types";

/** Imported records, kept in localStorage until a real backend exists. */
export function useSourceStore<T>(key: string) {
  const [state, setState] = useState<SourceState<T>>({ records: [], result: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setState(JSON.parse(raw) as SourceState<T>);
    } catch { /* storage unavailable or corrupt: start empty */ }
    setReady(true);
  }, [key]);

  const save = useCallback((next: SourceState<T>) => {
    setState(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore quota/private mode */ }
  }, [key]);

  const clear = useCallback(() => {
    setState({ records: [], result: null });
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  }, [key]);

  return { state, save, clear, ready };
}
