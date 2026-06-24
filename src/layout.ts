/**
 * Adaptive column layout.
 *
 * Generic over a row type `T`. A table is described by `Column<T>[]`; the layout
 * algorithm decides which columns are visible and how wide each is, given the
 * measured content widths and the terminal width.
 */

import type { Align } from './width.ts';

export interface Column<T> {
  /** Stable identifier used as the layout/content-width key. */
  key: string;
  /** Header label. */
  label: string;
  /** Plain text for width measurement and truncation (no ANSI, no links). */
  value: (row: T) => string;
  /**
   * Render the cell. Receives the already-truncated plain text, the row, and
   * the allotted display width for this cell. Returns the styled cell (colour,
   * hyperlink). It may fill the width itself (padding inside colour) or return
   * narrower output and let the renderer pad it (padding outside colour); the
   * renderer always pads any remaining space. Must not exceed the width.
   */
  style?: (text: string, row: T, width: number) => string;
  /** Horizontal alignment; default 'left'. */
  align?: Align;
  /** Minimum column width. */
  min: number;
  /** Maximum column width; default Infinity. A fixed-width column sets max === min. */
  max?: number;
  /** Lower = dropped last under width pressure. */
  priority: number;
  /** This column absorbs leftover space and the per-row indent prefix. */
  flex?: boolean;
  /** Default true; false = never truncate, always keep ≥1 trailing space. */
  truncate?: boolean;
}

export interface Layout {
  /** Allotted display width per visible column key. */
  widths: Map<string, number>;
  /** Visible column keys. */
  visible: Set<string>;
  /** Width of the header separator rule (margin + sum of allotted widths). */
  totalWidth: number;
}

/**
 * Compute visible columns and their widths.
 *
 * 1. Drop the lowest-priority columns until the minimums plus the margin fit.
 * 2. Give every surviving column its minimum width.
 * 3. Expand columns in priority order toward their measured content width, capped
 *    by each column's maximum.
 * 4. Hand any remaining space to the flex column (up to its content width).
 * 5. If space still remains, widen columns toward their header-label widths.
 *
 * Leftover space beyond these targets stays unallocated (the table does not
 * stretch to fill the terminal).
 */
export function computeLayout<T>(
  columns: Column<T>[],
  contentWidths: Map<string, number>,
  width: number,
  opts?: { margin?: number }
): Layout {
  const margin = opts?.margin ?? 0;
  const maxOf = (col: Column<T>) => col.max ?? Infinity;

  // Priority ascending (highest priority first); stable on the source order so
  // equal-priority columns keep their array order, and pop() drops the later one.
  let active = columns
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.priority - b.c.priority || a.i - b.i)
    .map((x) => x.c);

  // Step 1: drop lowest-priority columns until minimums + margin fit.
  while (active.length > 0) {
    const minSum = active.reduce((sum, col) => sum + col.min, 0) + margin;
    if (minSum <= width) break;
    active.pop();
  }

  // Step 2: allocate minimums.
  const widths = new Map<string, number>();
  for (const col of active) widths.set(col.key, col.min);

  const used = active.reduce((sum, col) => sum + col.min, 0) + margin;
  let remaining = Math.max(0, width - used);

  // Step 3: expand in priority order toward content width (capped by max).
  for (const col of active) {
    if (remaining <= 0) break;
    const current = widths.get(col.key)!;
    const content = contentWidths.get(col.key) ?? 0;
    const target = Math.min(Math.max(content, current), maxOf(col));
    const grow = Math.min(target - current, remaining);
    if (grow > 0) {
      widths.set(col.key, current + grow);
      remaining -= grow;
    }
  }

  // Step 4: leftover to the flex column (up to its content width).
  const flex = active.find((c) => c.flex);
  if (remaining > 0 && flex) {
    const current = widths.get(flex.key)!;
    const content = contentWidths.get(flex.key) ?? 0;
    const target = Math.min(Math.max(content, current), maxOf(flex));
    const grow = Math.min(target - current, remaining);
    if (grow > 0) {
      widths.set(flex.key, current + grow);
      remaining -= grow;
    }
  }

  // Step 5: expand toward header label width (only if space remains).
  for (const col of active) {
    if (remaining <= 0) break;
    const current = widths.get(col.key)!;
    const labelWidth = col.label.length + 1;
    if (labelWidth > current) {
      const grow = Math.min(labelWidth - current, remaining);
      widths.set(col.key, current + grow);
      remaining -= grow;
    }
  }

  const visible = new Set(active.map((c) => c.key));
  const totalWidth = active.reduce((sum, col) => sum + (widths.get(col.key) ?? 0), 0) + margin;

  return { widths, visible, totalWidth };
}
