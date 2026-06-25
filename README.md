# @echobravoyahoo/tables

Session-agnostic CLI table rendering: adaptive column widths, ANSI/OSC 8-aware
truncation, alignment, headers, and tree-indent rows. The library turns columns
plus rows into aligned terminal lines and returns them; the caller prints.

It is colour-agnostic — colour and links are injected by the caller through
per-column hooks, so there is no `chalk` peer dependency and no `process` use.
[`string-width`](https://github.com/sindresorhus/string-width) (correct CJK /
emoji / zero-width measurement) is bundled into the published build, so the
package has **zero runtime dependencies**.

## Install

```sh
npm install @echobravoyahoo/tables
```

The built `dist/` is committed and dependency-free (string-width bundled in), so
a git dependency (`github:<owner>/tables#<tag>`) resolves on a plain `npm install`
with no build step, dev toolchain, or nested dependency install — portable across
npm versions. Run `npm run compile` after changing `src/` and commit the refreshed
`dist/` alongside. (The script is named `compile`, not `build`: npm runs a `build`
script during git-dependency install, which would re-trigger the nested-install
failure above.)

## Usage

```ts
import { renderTable, type Column, type Row } from '@echobravoyahoo/tables';

interface Task { id: string; name: string; done: boolean }

const columns: Column<Task>[] = [
  { key: 'id', label: 'ID', value: (t) => t.id, min: 6, max: 6, priority: 2 },
  { key: 'name', label: 'Name', value: (t) => t.name, min: 8, priority: 2, flex: true,
    style: (text) => text }, // wrap in colour/links here
  { key: 'done', label: 'Done', value: (t) => (t.done ? '✓' : ''), min: 4, max: 4, priority: 1 },
];

const rows: Row<Task>[] = tasks.map((t) => ({ type: 'data', row: t }));

const { lines } = renderTable(columns, rows, { width: process.stdout.columns || 80, margin: 2 });
for (const line of lines) console.log(line);
```

## API

- `renderTable(columns, rows, options)` → `{ lines, layout }`. Measures each
  column from its plain `value`, lays out widths, truncates plain text, applies
  each column's `style`, and assembles the header, separator, and rows.
- `computeLayout(columns, contentWidths, width, opts)` → `{ widths, visible, totalWidth }`.
  The column-fitting algorithm in isolation: drop the lowest-priority columns
  until the minimums fit, expand toward content widths (capped by `max`), hand
  leftover to the flex column, then widen toward header labels.
- Primitives: `displayWidth`, `truncate`, `pad`, `fixedWidth`, `stripAnsi`,
  `stripOsc8`, `hyperlink(url, text, { force })`.

### Column

A `Column<T>` pairs a plain `value(row)` (measured and truncated by the renderer)
with an optional `style(text, row, width)` hook that colours/links the fitted
cell. `min`/`max`/`priority` drive the layout; `flex` marks the column that
absorbs leftover space and per-row indent; `truncate: false` keeps a column from
being shortened (and keeps ≥1 trailing space). A fixed-width column sets
`max === min`.

### Row

A `Row<T>` is either a `data` row (`{ type: 'data', row, indent? }`) the renderer
splits into cells, or a `literal` row (`{ type: 'literal', render(totalWidth) }`)
the renderer emits verbatim — the escape hatch for separators, section headers,
or gap markers.
