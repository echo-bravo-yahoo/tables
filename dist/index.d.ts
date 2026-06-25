/**
 * @echobravoyahoo/tables — session-agnostic CLI table rendering.
 *
 * The caller describes columns (plain value + style hook) and rows; the library
 * computes adaptive widths, drops columns under width pressure, truncates plain
 * text (ANSI/OSC8-aware), and assembles aligned lines with an optional header and
 * separator. Colour and links are injected by the caller through per-column
 * hooks, so the library stays colour-agnostic.
 */
export { renderTable } from './table.ts';
export type { Row, RenderOptions, RenderResult } from './table.ts';
export { computeLayout } from './layout.ts';
export type { Column, Layout } from './layout.ts';
export { displayWidth, truncate, pad, fixedWidth, stripAnsi, stripOsc8 } from './width.ts';
export type { Align } from './width.ts';
export { hyperlink } from './hyperlink.ts';
//# sourceMappingURL=index.d.ts.map