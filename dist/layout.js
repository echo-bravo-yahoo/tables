/**
 * Adaptive column layout.
 *
 * Generic over a row type `T`. A table is described by `Column<T>[]`; the layout
 * algorithm decides which columns are visible and how wide each is, given the
 * measured content widths and the terminal width.
 */
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
export function computeLayout(columns, contentWidths, width, opts) {
    const margin = opts?.margin ?? 0;
    const maxOf = (col) => col.max ?? Infinity;
    // Priority ascending (highest priority first); stable on the source order so
    // equal-priority columns keep their array order, and pop() drops the later one.
    let active = columns
        .map((c, i) => ({ c, i }))
        .sort((a, b) => a.c.priority - b.c.priority || a.i - b.i)
        .map((x) => x.c);
    // Step 1: drop lowest-priority columns until minimums + margin fit.
    while (active.length > 0) {
        const minSum = active.reduce((sum, col) => sum + col.min, 0) + margin;
        if (minSum <= width)
            break;
        active.pop();
    }
    // Step 2: allocate minimums.
    const widths = new Map();
    for (const col of active)
        widths.set(col.key, col.min);
    const used = active.reduce((sum, col) => sum + col.min, 0) + margin;
    let remaining = Math.max(0, width - used);
    // Step 3: expand in priority order toward content width (capped by max).
    for (const col of active) {
        if (remaining <= 0)
            break;
        const current = widths.get(col.key);
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
        const current = widths.get(flex.key);
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
        if (remaining <= 0)
            break;
        const current = widths.get(col.key);
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
//# sourceMappingURL=layout.js.map