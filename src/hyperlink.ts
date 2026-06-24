/**
 * OSC 8 terminal hyperlink support.
 *
 * The library has no `process` dependency, so whether to emit escapes is passed
 * explicitly via `force` (callers typically pass `process.stdout.isTTY`). When
 * `force` is false the plain text is returned unchanged.
 */

export function hyperlink(url: string, text: string, opts?: { force?: boolean }): string {
  if (!opts?.force) return text;
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}
