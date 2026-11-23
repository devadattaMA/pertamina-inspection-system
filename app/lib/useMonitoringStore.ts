"use client";

import { useCallback, useEffect, useState } from "react";
import { sampleMonitoring } from "./monitoring";
import type { MonitoringRecord } from "./types";

const KEY = "phm:v1:monitoring";

/**
 * Corrosion monitoring log, kept in localStorage until a backend exists.
 * Seeded once with sample history that stands in for the Excel workbook;
 * after that, deleting every record does not bring the sample data back.
 */
export function useMonitoringStore() {
  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let initial: MonitoringRecord[] | null = null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw !== null) initial = JSON.parse(raw) as MonitoringRecord[];
    } catch { /* unavailable or corrupt: fall through to sample data */ }
    if (!initial) {
      initial = sampleMonitoring();
      try { window.localStorage.setItem(KEY, JSON.stringify(initial)); } catch { /* ignore */ }
    }
    setRecords(initial);
    setReady(true);
  }, []);

  const persist = useCallback((next: MonitoringRecord[]) => {
    setRecords(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore quota/private mode */ }
  }, []);

  const add = useCallback((record: MonitoringRecord) => persist([...records, record]), [records, persist]);
  const remove = useCallback((id: string) => persist(records.filter(r => r.id !== id)), [records, persist]);

  return { records, ready, add, remove };
}
