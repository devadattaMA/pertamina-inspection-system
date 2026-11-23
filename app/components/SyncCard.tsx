"use client";

import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { formatDate } from "../lib/dates";
import type { SyncResult } from "../lib/types";

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  result: SyncResult | null;
  recordCount: number;
  syncing: boolean;
  ready: boolean;
  error: string;
  onSync: () => void;
};

export default function SyncCard({ icon, title, description, result, recordCount, syncing, ready, error, onSync }: Props) {
  const time = result ? new Date(result.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <section className="panel sync-card">
      <div className="sync-main">
        <span className="sync-icon">{icon}</span>
        <div className="sync-copy">
          <strong>{title}</strong>
          <small>{description}</small>
          <small className="sync-meta">
            {!ready ? "Loading…" : syncing && !result ? "First import in progress…" : result
              ? <>Last sync {time} · data window {formatDate(result.window.from)} – {formatDate(result.window.to)} · <b>{recordCount.toLocaleString("en-US")}</b> records stored</>
              : "Not synchronized yet"}
          </small>
        </div>
        <button className="button button-primary" onClick={onSync} disabled={syncing || !ready}>
          <RefreshCw size={15} className={syncing ? "spin" : ""} /> {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>
      {result && !error && (
        <div className="sync-stats">
          <span className="chip green"><CheckCircle2 size={11} /> {result.fetched.toLocaleString("en-US")} fetched</span>
          <span className="chip blue">+{result.added.toLocaleString("en-US")} new</span>
          <span className="chip amber">{result.updated.toLocaleString("en-US")} updated</span>
          <span className="chip slate">{result.unchanged.toLocaleString("en-US")} unchanged (no duplicates)</span>
          {result.unlinked.length > 0 && (
            <span className="chip red"><AlertTriangle size={11} /> Skipped, not in asset register: {result.unlinked.join(", ")}</span>
          )}
        </div>
      )}
      {error && <div className="sync-error"><AlertTriangle size={14} /> {error}</div>}
    </section>
  );
}
