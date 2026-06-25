/**
 * Width-measurement and fitting primitives.
 *
 * Display width is measured with `string-width`, which accounts for East-Asian
 * double-width characters, emoji, and zero-width / combining marks. OSC 8
 * hyperlink wrappers are stripped first so the link escape sequences do not
 * count toward the width.
 */

import stringWidth from 'string-width';

const OSC8 = /\x1b\]8;;[^\x1b]*\x1b\\/g;
const ANSI = /\x1b\[[0-9;]*m/g;

/** Strip ANSI SGR (colour) escape sequences. */
export function stripAnsi(str: string): string {
  return str.replace(ANSI, '');
}

/** Strip OSC 8 hyperlink wrapper sequences (the open `…\x1b\\` and close `\x1b]8;;\x1b\\`). */
export function stripOsc8(str: string): string {
  return str.replace(OSC8, '');
}

/**
 * Visual display width of a string, ignoring OSC 8 hyperlink wrappers and ANSI
 * colour codes. `string-width` strips ANSI internally; OSC 8 is stripped here.
 */
export function displayWidth(str: string): number {
  return stringWidth(stripOsc8(str));
}

/**
 * Truncate plain text to at most `width` display columns, appending `…` when it
 * overflows. The ellipsis occupies one column, so the result is at most
 * `width - 1` columns of content plus the ellipsis (total ≤ `width`). Text that
 * already fits within `width - 1` columns is returned unchanged.
 *
 * Truncation runs on plain text only — callers wrap colour/links afterward.
 */
export function truncate(text: string, width: number): string {
  if (width <= 0) return '';
  if (displayWidth(text) < width) return text;
  // Reserve one column for the ellipsis.
  let out = '';
  let w = 0;
  for (const ch of text) {
    const cw = displayWidth(ch);
    if (w + cw > width - 1) break;
    out += ch;
    w += cw;
  }
  return out + '…';
}

export type Align = 'left' | 'center' | 'right';

/**
 * Pad text with spaces to exactly `width` display columns. Padding spaces are
 * appended/prepended outside any colour or link sequences the text contains.
 * Text already at or beyond `width` is returned unchanged.
 */
export function pad(text: string, width: number, align: Align = 'left'): string {
  const deficit = width - displayWidth(text);
  if (deficit <= 0) return text;
  if (align === 'right') return ' '.repeat(deficit) + text;
  if (align === 'center') {
    const left = Math.floor(deficit / 2);
    return ' '.repeat(left) + text + ' '.repeat(deficit - left);
  }
  return text + ' '.repeat(deficit);
}

/**
 * Fit a string to exactly `width` display columns: truncate-with-ellipsis when
 * too wide, pad with trailing spaces when too narrow.
 *
 * When the input is wrapped in a single OSC 8 hyperlink, truncation runs on the
 * inner text and the wrapper is re-applied so the link stays valid; padding is
 * placed outside the link. When truncating, a trailing space follows the
 * ellipsis (so the total is exactly `width`).
 */
export function fixedWidth(str: string, width: number): string {
  const visualWidth = displayWidth(str);
  if (visualWidth >= width) {
    const osc8 = str.match(/^\x1b\]8;;([^\x1b]*)\x1b\\([\s\S]*)\x1b\]8;;\x1b\\$/);
    const inner = osc8 ? osc8[2] : str;
    let truncated = '';
    let w = 0;
    for (const char of inner) {
      const cw = displayWidth(char);
      if (w + cw > width - 2) break;
      truncated += char;
      w += cw;
    }
    const content = truncated + '…';
    const wrapped = osc8 ? `\x1b]8;;${osc8[1]}\x1b\\${content}\x1b]8;;\x1b\\` : content;
    return wrapped + ' ';
  }
  return str + ' '.repeat(width - visualWidth);
}
