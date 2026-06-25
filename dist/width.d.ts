/**
 * Width-measurement and fitting primitives.
 *
 * Display width is measured with `string-width`, which accounts for East-Asian
 * double-width characters, emoji, and zero-width / combining marks. OSC 8
 * hyperlink wrappers are stripped first so the link escape sequences do not
 * count toward the width.
 */
/** Strip ANSI SGR (colour) escape sequences. */
export declare function stripAnsi(str: string): string;
/** Strip OSC 8 hyperlink wrapper sequences (the open `…\x1b\\` and close `\x1b]8;;\x1b\\`). */
export declare function stripOsc8(str: string): string;
/**
 * Visual display width of a string, ignoring OSC 8 hyperlink wrappers and ANSI
 * colour codes. `string-width` strips ANSI internally; OSC 8 is stripped here.
 */
export declare function displayWidth(str: string): number;
/**
 * Truncate plain text to at most `width` display columns, appending `…` when it
 * overflows. The ellipsis occupies one column, so the result is at most
 * `width - 1` columns of content plus the ellipsis (total ≤ `width`). Text that
 * already fits within `width - 1` columns is returned unchanged.
 *
 * Truncation runs on plain text only — callers wrap colour/links afterward.
 */
export declare function truncate(text: string, width: number): string;
export type Align = 'left' | 'center' | 'right';
/**
 * Pad text with spaces to exactly `width` display columns. Padding spaces are
 * appended/prepended outside any colour or link sequences the text contains.
 * Text already at or beyond `width` is returned unchanged.
 */
export declare function pad(text: string, width: number, align?: Align): string;
/**
 * Fit a string to exactly `width` display columns: truncate-with-ellipsis when
 * too wide, pad with trailing spaces when too narrow.
 *
 * When the input is wrapped in a single OSC 8 hyperlink, truncation runs on the
 * inner text and the wrapper is re-applied so the link stays valid; padding is
 * placed outside the link. When truncating, a trailing space follows the
 * ellipsis (so the total is exactly `width`).
 */
export declare function fixedWidth(str: string, width: number): string;
//# sourceMappingURL=width.d.ts.map