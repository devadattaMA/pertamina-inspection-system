"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pager({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
      <span className="page-info">Page {page} of {pageCount}</span>
      <button disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
    </div>
  );
}
