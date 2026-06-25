/**
 * @echobravoyahoo/tables — session-agnostic CLI table rendering.
 *
 * The caller describes columns (plain value + style hook) and rows; the library
 * computes adaptive widths, drops columns under width pressure, truncates plain
 * text (ANSI/OSC8-aware), and assembles aligned lines with an optional header and
 * separator. Colour and links are injected by the caller through per-column
 * hooks, so the library stays colour-agnostic.
 */
export { renderTable } from "./table.js";
export { computeLayout } from "./layout.js";
export { displayWidth, truncate, pad, fixedWidth, stripAnsi, stripOsc8 } from "./width.js";
export { hyperlink } from "./hyperlink.js";
//# sourceMappingURL=index.js.map