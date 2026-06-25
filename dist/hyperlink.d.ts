/**
 * OSC 8 terminal hyperlink support.
 *
 * The library has no `process` dependency, so whether to emit escapes is passed
 * explicitly via `force` (callers typically pass `process.stdout.isTTY`). When
 * `force` is false the plain text is returned unchanged.
 */
export declare function hyperlink(url: string, text: string, opts?: {
    force?: boolean;
}): string;
//# sourceMappingURL=hyperlink.d.ts.map