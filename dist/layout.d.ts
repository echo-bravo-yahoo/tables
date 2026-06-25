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
export declare function computeLayout<T>(columns: Column<T>[], contentWidths: Map<string, number>, width: number, opts?: {
    margin?: number;
}): Layout;
//# sourceMappingURL=layout.d.ts.map