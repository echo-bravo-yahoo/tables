import { describe, it } from 'node:test';
import assert from 'node:assert';
import { displayWidth, truncate, pad, fixedWidth, stripAnsi, stripOsc8 } from '../src/width.ts';

const link = (url: string, text: string) => `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[39m`;

describe('width', () => {
  describe('stripAnsi', () => {
    it('removes SGR colour sequences', () => {
      assert.strictEqual(stripAnsi(cyan('hi')), 'hi');
    });
    it('leaves plain text untouched', () => {
      assert.strictEqual(stripAnsi('hello'), 'hello');
    });
    it('does not strip OSC 8 (that is stripOsc8 job)', () => {
      assert.strictEqual(stripAnsi(link('http://x', 'hi')), link('http://x', 'hi'));
    });
  });

  describe('stripOsc8', () => {
    it('removes a hyperlink wrapper, keeping the visible text', () => {
      assert.strictEqual(stripOsc8(link('https://example.com', 'click')), 'click');
    });
    it('leaves SGR sequences in place', () => {
      assert.strictEqual(stripOsc8(cyan('hi')), cyan('hi'));
    });
  });

  describe('displayWidth', () => {
    it('counts ASCII by character', () => {
      assert.strictEqual(displayWidth('hello'), 5);
    });
    it('counts a Nerd Font private-use icon as width 1 (surrogate pair)', () => {
      const icon = '\u{F0298}';
      assert.strictEqual(icon.length, 2);
      assert.strictEqual(displayWidth(icon), 1);
    });
    it('counts box-drawing glyphs as width 1', () => {
      assert.strictEqual(displayWidth('┌└├│─'), 5);
    });
    it('counts the ellipsis as width 1', () => {
      assert.strictEqual(displayWidth('…'), 1);
    });
    it('counts CJK characters as double-width', () => {
      assert.strictEqual(displayWidth('你好'), 4);
    });
    it('counts wide emoji as double-width', () => {
      assert.strictEqual(displayWidth('😀'), 2);
    });
    it('ignores zero-width and combining marks', () => {
      assert.strictEqual(displayWidth('a​'), 1); // zero-width space
      assert.strictEqual(displayWidth('é'), 1); // combining acute accent
    });
    it('ignores ANSI colour codes', () => {
      assert.strictEqual(displayWidth(cyan('hello')), 5);
    });
    it('ignores OSC 8 hyperlink wrappers', () => {
      assert.strictEqual(displayWidth(link('https://example.com/very/long', 'hi')), 2);
    });
    it('handles the empty string', () => {
      assert.strictEqual(displayWidth(''), 0);
    });
  });

  describe('truncate', () => {
    it('returns short text unchanged', () => {
      assert.strictEqual(truncate('hi', 10), 'hi');
    });
    it('truncates with an ellipsis, reserving one column for it', () => {
      assert.strictEqual(truncate('a-very-long-string', 10), 'a-very-lo…');
      assert.strictEqual(displayWidth(truncate('a-very-long-string', 10)), 10);
    });
    it('truncates when text exactly equals width', () => {
      // dw === width triggers truncation (matches the legacy fixedWidth boundary)
      assert.strictEqual(truncate('1234567890', 10), '123456789…');
    });
    it('accounts for double-width characters', () => {
      // Each CJK char is width 2; width 5 leaves room for 2 chars (4 cols) + ellipsis
      assert.strictEqual(truncate('你好世界', 5), '你好…');
      assert.strictEqual(displayWidth(truncate('你好世界', 5)), 5);
    });
    it('returns empty for non-positive width', () => {
      assert.strictEqual(truncate('hi', 0), '');
    });
  });

  describe('pad', () => {
    it('left-pads by default (appends)', () => {
      assert.strictEqual(pad('hi', 5), 'hi   ');
    });
    it('right-aligns', () => {
      assert.strictEqual(pad('hi', 5, 'right'), '   hi');
    });
    it('center-aligns', () => {
      assert.strictEqual(pad('hi', 6, 'center'), '  hi  ');
    });
    it('leaves text at or beyond width unchanged', () => {
      assert.strictEqual(pad('hello', 5), 'hello');
      assert.strictEqual(pad('hello', 3), 'hello');
    });
    it('pads outside ANSI sequences (measures display width)', () => {
      assert.strictEqual(pad(cyan('hi'), 5), cyan('hi') + '   ');
    });
  });

  describe('fixedWidth', () => {
    it('pads short text to exact width', () => {
      assert.strictEqual(fixedWidth('hi', 10), 'hi        ');
      assert.strictEqual(displayWidth(fixedWidth('hi', 10)), 10);
    });
    it('truncates long text with ellipsis + trailing space', () => {
      assert.strictEqual(fixedWidth('a-very-long-string', 10), 'a-very-l… ');
      assert.strictEqual(displayWidth(fixedWidth('a-very-long-string', 10)), 10);
    });
    it('keeps a hyperlink wrapper intact when truncating, padding outside it', () => {
      const linked = link('https://example.com/long', 'a-very-long-string');
      const fixed = fixedWidth(linked, 10);
      assert.match(fixed, /^\x1b\]8;;https:\/\/example\.com\/long\x1b\\/);
      assert.match(fixed, /\x1b\]8;;\x1b\\ $/);
      assert.ok(fixed.includes('…'));
      assert.strictEqual(displayWidth(fixed), 10);
    });
    it('places padding outside the OSC 8 link', () => {
      const fixed = fixedWidth(link('https://x.com', 'hi'), 10);
      const closeIdx = fixed.indexOf('\x1b]8;;\x1b\\');
      const trailing = fixed.slice(closeIdx + '\x1b]8;;\x1b\\'.length);
      assert.strictEqual(trailing, '        ');
    });
    it('accounts for double-width characters when truncating', () => {
      // ↔ (U+2194) has display width 2; the truncation loop must not count it as 1
      const result = fixedWidth('abc↔def', 8);
      assert.strictEqual(displayWidth(result), 8);
    });
  });
});
