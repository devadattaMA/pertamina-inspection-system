"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APP_TODAY, addDays } from "./dates";
import { mergeInspections, mergeProduction } from "./ingest";
import type { InspectionRecord, ProductionRecord, RawInspection, RawProduction, SyncResult } from "./types";
import { useSourceStore } from "./useSourceStore";

type Window = { from: string; to: string };

type Options<T, Raw> = {
  key: string;
  endpoint: string;
  label: string;
  backfillDays: number; // first import window
  overlapDays: number; // later syncs re-pull this many days to pick up revisions
  merge: (existing: T[], raw: Raw[], window: Window) => { records: T[]; result: SyncResult };
  notify: (message: string) => void;
};

/** Stored records for one source system plus its sync action; imports automatically on first use. */
function useSource<T, Raw>(options: Options<T, Raw>) {
  const { state, save, ready } = useSourceStore<T>(options.key);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(options);
  latest.current = options;

  const sync = useCallback(async (silent: boolean) => {
    const o = latest.current;
    setSyncing(true);
    setError("");
    try {
      const backfillFrom = addDays(APP_TODAY, -(o.backfillDays - 1));
      const lastTo = state.result?.window.to;
      const overlapFrom = lastTo ? addDays(lastTo, -o.overlapDays) : backfillFrom;
      const from = overlapFrom > backfillFrom ? overlapFrom : backfillFrom;
      const res = await fetch(`${o.endpoint}?from=${from}&to=${APP_TODAY}`);
      if (!res.ok) throw new Error(`${o.label} responded with status ${res.status}.`);
      const payload = (await res.json()) as { records: Raw[] };
      const { records, result } = o.merge(state.records, payload.records, { from, to: APP_TODAY });
      save({ records, result });
      if (!silent) o.notify(`${o.label} synced: ${result.added} new, ${result.updated} updated, ${result.unchanged} unchanged.`);
    } catch (e) {
      setError(e instanceof Error ? `Sync failed: ${e.message}` : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }, [state, save]);

  // First use: import automatically, no manual request needed.
  const autoRan = useRef(false);
  useEffect(() => {
    if (ready && !state.result && !autoRan.current) { autoRan.current = true; void sync(true); }
  }, [ready, state.result, sync]);

  return { state, ready, syncing, error, sync };
}

export const useProductionSource = (notify: (m: string) => void) =>
  useSource<ProductionRecord, RawProduction>({ key: "phm:v1:production", endpoint: "/api/direct-viewer", label: "Direct Viewer", backfillDays: 90, overlapDays: 7, merge: mergeProduction, notify });

export const useInspectionSource = (notify: (m: string) => void) =>
  useSource<InspectionRecord, RawInspection>({ key: "phm:v1:inspection-sap", endpoint: "/api/sap/inspections", label: "SAP", backfillDays: 365, overlapDays: 30, merge: mergeInspections, notify });
