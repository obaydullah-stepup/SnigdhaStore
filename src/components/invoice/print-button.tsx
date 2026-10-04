"use client";

/**
 * Opens the browser print dialog, where "Save as PDF" produces a downloadable
 * copy of the invoice. Used by both the staff and customer invoice routes.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-primary text-primary-foreground hover:bg-primary/80 rounded-lg px-3 py-2 text-sm font-medium"
    >
      Print / Save PDF
    </button>
  );
}
