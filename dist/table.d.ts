/**
 * Table rendering: turn columns + rows into aligned terminal lines.
 *
 * The renderer measures each column from its plain `value`, lays the columns out
 * with `computeLayout`, then builds each line. Truncation runs on plain text;
 * colour and links are applied by each column's `style` hook to text that already
 * fits. The renderer pads any leftover width (outside colour/links).
 */
import { type Column, type Layout } from './layout.ts';
export type Row<T> = 
/**
 * A normal table row backed by one `T`. Each cell is built from a column's
 * `value`/`style`. `indent` is an optional leading prefix (indentation plus a
 * tree connector) placed before the first column; its display width is
 * subtracted from the flex column so the total width stays constant.
 */
{
    type: 'data';
    row: T;
    indent?: string;
}
/**
 * A row the renderer does NOT split into columns. The caller returns the whole
 * pre-rendered line from `render(totalWidth)` — the escape hatch for gap
 * markers, section headers, or blank spacers.
 */
 | {
    type: 'literal';
    render: (totalWidth: number) => string;
};
export interface RenderOptions {
    /** Terminal width; default 80. */
    width?: number;
    /** Leading spaces before the first column; default 0. */
    margin?: number;
    /** Render the header row; default true. */
    header?: boolean;
    /** Style the assembled header line. */
    headerStyle?: (text: string) => string;
    /** Render the ─ rule under the header; default true. */
    separator?: boolean;
    /** Style the separator line. */
    separatorStyle?: (text: string) => string;
    /** Leave the final column unpadded (e.g. a trailing relative-time column). */
    trimLastColumn?: boolean;
}
export interface RenderResult {
    lines: string[];
    layout: Layout;
}
export declare function renderTable<T>(columns: Column<T>[], rows: Row<T>[], options?: RenderOptions): RenderResult;
//# sourceMappingURL=table.d.ts.map