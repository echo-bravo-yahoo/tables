/**
 * Table rendering: turn columns + rows into aligned terminal lines.
 *
 * The renderer measures each column from its plain `value`, lays the columns out
 * with `computeLayout`, then builds each line. Truncation runs on plain text;
 * colour and links are applied by each column's `style` hook to text that already
 * fits. The renderer pads any leftover width (outside colour/links).
 */
import { computeLayout } from "./layout.js";
import { displayWidth, truncate, fixedWidth } from "./width.js";
function padCell(cell, width, align, minPad) {
    const deficit = Math.max(minPad, width - displayWidth(cell));
    if (deficit <= 0)
        return cell;
    if (align === 'right')
        return ' '.repeat(deficit) + cell;
    if (align === 'center') {
        const left = Math.floor(deficit / 2);
        return ' '.repeat(left) + cell + ' '.repeat(deficit - left);
    }
    return cell + ' '.repeat(deficit);
}
/**
 * Measure content widths from the data rows. Every column reserves one trailing
 * column of inter-column spacing. The flex column additionally reserves room for
 * the deepest row's indent prefix (measured per row as value + indent, so the
 * widest indented cell wins rather than the widest name and deepest indent
 * independently).
 */
function measure(columns, dataRows) {
    const contentWidths = new Map();
    for (const col of columns) {
        let max = 0;
        for (const r of dataRows) {
            const valueW = displayWidth(col.value(r.row));
            const w = col.flex ? valueW + displayWidth(r.indent ?? '') : valueW;
            if (w > max)
                max = w;
        }
        contentWidths.set(col.key, max + 1);
    }
    return contentWidths;
}
export function renderTable(columns, rows, options) {
    const width = options?.width ?? 80;
    const margin = options?.margin ?? 0;
    const showHeader = options?.header ?? true;
    const showSeparator = options?.separator ?? true;
    const trimLast = options?.trimLastColumn ?? false;
    const dataRows = rows.filter((r) => r.type === 'data');
    const contentWidths = measure(columns, dataRows);
    const layout = computeLayout(columns, contentWidths, width, { margin });
    const visibleCols = columns.filter((c) => layout.visible.has(c.key));
    const flexKey = columns.find((c) => c.flex)?.key;
    const firstKey = visibleCols[0]?.key;
    const lastVisibleKey = visibleCols[visibleCols.length - 1]?.key;
    // The trimmable column is the last column in the array, trimmed only when it
    // is also the last visible column.
    const trimmableKey = trimLast ? columns[columns.length - 1]?.key : undefined;
    const isTrimmed = (key) => key === trimmableKey && key === lastVisibleKey;
    const marginStr = ' '.repeat(margin);
    const lines = [];
    if (showHeader) {
        let header = marginStr;
        for (const col of visibleCols) {
            let w = layout.widths.get(col.key);
            if (col.key === firstKey)
                w -= margin;
            header += isTrimmed(col.key) ? col.label : fixedWidth(col.label, w);
        }
        lines.push(options?.headerStyle ? options.headerStyle(header) : header);
    }
    if (showSeparator) {
        const sep = '─'.repeat(layout.totalWidth);
        lines.push(options?.separatorStyle ? options.separatorStyle(sep) : sep);
    }
    for (const r of rows) {
        if (r.type === 'literal') {
            lines.push(r.render(layout.totalWidth));
            continue;
        }
        const indent = r.indent ?? '';
        const indentW = displayWidth(indent);
        let line = marginStr + indent;
        for (const col of visibleCols) {
            let allotted = layout.widths.get(col.key);
            if (col.key === firstKey)
                allotted -= margin;
            if (col.key === flexKey)
                allotted -= indentW;
            const doTruncate = col.truncate !== false;
            const plain = col.value(r.row);
            const fitted = doTruncate ? truncate(plain, allotted) : plain;
            let cell = col.style ? col.style(fitted, r.row, allotted) : fitted;
            if (!isTrimmed(col.key)) {
                cell = padCell(cell, allotted, col.align, doTruncate ? 0 : 1);
            }
            line += cell;
        }
        lines.push(line);
    }
    return { lines, layout };
}
//# sourceMappingURL=table.js.map