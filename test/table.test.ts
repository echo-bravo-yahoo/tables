import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderTable, type Column, type Row } from '../src/index.ts';
import { displayWidth } from '../src/width.ts';

type R = Record<string, string>;
const col = (key: string, extra: Partial<Column<R>> = {}): Column<R> => ({
  key,
  label: key,
  value: (r) => r[key] ?? '',
  min: 4,
  priority: 1,
  ...extra,
});
const data = (row: R, indent?: string): Row<R> => ({ type: 'data', row, indent });

describe('renderTable', () => {
  it('renders a single visible column', () => {
    const res = renderTable([col('a', { flex: true, max: 20 })], [data({ a: 'hello' })], {
      width: 20,
      header: false,
      separator: false,
    });
    assert.strictEqual(res.lines.length, 1);
    assert.ok(res.lines[0].startsWith('hello'));
  });

  it('drops columns at extreme narrow width and survives width 0/1', () => {
    const cols = [col('a', { priority: 1, flex: true }), col('b', { priority: 2 })];
    for (const width of [0, 1]) {
      const res = renderTable(cols, [data({ a: 'x', b: 'y' })], { width, header: false, separator: false });
      assert.strictEqual(res.lines.length, 1); // never throws, always one line
    }
  });

  it('handles Infinity-ish wide widths without stretching past content', () => {
    const res = renderTable([col('a', { flex: true, max: 8 }), col('b', { max: 8 })], [data({ a: 'hi', b: 'yo' })], {
      width: 10_000,
    });
    // Columns cap at content/max; total width stays small.
    assert.ok(res.layout.totalWidth < 40);
  });

  it('respects the margin (leading spaces, carved from the first column)', () => {
    const res = renderTable([col('a', { flex: true, min: 10 })], [data({ a: 'hi' })], {
      width: 20,
      margin: 3,
      header: false,
      separator: false,
    });
    assert.ok(res.lines[0].startsWith('   hi'));
  });

  it('renders empty/missing cell values as spaces', () => {
    const res = renderTable([col('a', { min: 5, max: 5 }), col('b', { flex: true })], [data({ b: 'x' })], {
      width: 20,
      header: false,
      separator: false,
    });
    assert.ok(res.lines[0].startsWith('     ')); // 5 spaces for empty 'a'
  });

  it('truncate:false never truncates and keeps ≥1 trailing space', () => {
    // overflow: value wider than allotted; status-style column
    const res = renderTable(
      [col('s', { min: 4, max: 4, truncate: false }), col('a', { flex: true })],
      [data({ s: 'archived', a: 'x' })],
      { width: 30, header: false, separator: false },
    );
    assert.ok(res.lines[0].startsWith('archived ')); // not truncated, ≥1 space after
  });

  it('pads cells so each row reaches the same width (alignment contract)', () => {
    const cols = [col('a', { flex: true, max: 30 }), col('b', { max: 10 }), col('c', { max: 10 })];
    const rows = [data({ a: 'alpha', b: 'one', c: 'two' }), data({ a: 'a-longer-name', b: 'x', c: 'y' })];
    const res = renderTable(cols, rows, { width: 60, margin: 2 });
    const dataLines = res.lines.slice(2); // skip header + separator
    // Width-preservation: with no trimmed column, every data line is totalWidth - margin.
    for (const line of dataLines) {
      assert.strictEqual(displayWidth(line), res.layout.totalWidth - 2);
    }
  });

  it('applies right and center alignment', () => {
    const res = renderTable(
      [col('a', { min: 8, max: 8, align: 'right' }), col('b', { flex: true })],
      [data({ a: 'hi', b: 'x' })],
      { width: 30, header: false, separator: false },
    );
    assert.ok(res.lines[0].startsWith('      hi')); // right-aligned in 8
  });

  it('emits literal rows verbatim via render(totalWidth)', () => {
    const res = renderTable([col('a', { flex: true })], [
      data({ a: 'row1' }),
      { type: 'literal', render: (tw) => `<literal width=${tw}>` },
    ], { width: 20, header: false, separator: false });
    assert.ok(res.lines.some((l) => l === `<literal width=${res.layout.totalWidth}>`));
  });

  it('keeps a fixed-width column (min === max) constant', () => {
    const narrow = renderTable([col('id', { min: 10, max: 10 }), col('a', { flex: true })], [data({ id: 'x', a: 'y' })], { width: 25 });
    const wide = renderTable([col('id', { min: 10, max: 10 }), col('a', { flex: true })], [data({ id: 'x', a: 'y' })], { width: 200 });
    assert.strictEqual(narrow.layout.widths.get('id'), 10);
    assert.strictEqual(wide.layout.widths.get('id'), 10);
  });

  it('gives leftover space to the flex column up to its content width', () => {
    const longName = 'a-really-long-name-that-wants-all-the-space';
    const res = renderTable(
      [col('id', { min: 8, max: 8 }), col('name', { flex: true, min: 8, max: 100 }), col('x', { min: 5, max: 5 })],
      [data({ id: 'a', name: longName, x: 'c' })],
      { width: 80, margin: 2 },
    );
    // Budget 80; id 8 + x 5 + margin 2 = 15 fixed; the flex name absorbs the rest
    // (content 43+1=44 fits) → grows well beyond its min of 8.
    assert.strictEqual(res.layout.widths.get('name'), longName.length + 1);
  });

  describe('indent math', () => {
    it('shrinks the flex column by the indent width, holding total constant', () => {
      const cols = [col('id', { min: 6, max: 6 }), col('name', { flex: true, max: 40 }), col('s', { min: 5, max: 5 })];
      const rows = [data({ id: 'aaaaaa', name: 'parent', s: 'busy' }), data({ id: 'bbbbbb', name: 'child', s: 'busy' }, '  └ ')];
      const res = renderTable(cols, rows, { width: 50, margin: 2, header: false, separator: false });
      const [parentLine, childLine] = res.lines;
      // Both rows occupy the same display width even though the child carries an indent prefix.
      assert.strictEqual(displayWidth(parentLine), displayWidth(childLine));
    });

    it('reserves room for the deepest indent when measuring the flex column', () => {
      // The widest cell is a short name at a deep indent; the flex content must
      // account for value + indent per row, not max(value) + max(indent).
      const cols = [col('name', { flex: true, max: 100, min: 4 })];
      const rows = [data({ name: 'short' }, '        '), data({ name: 'a-much-longer-name' })];
      const res = renderTable(cols, rows, { width: 200, header: false, separator: false });
      // The deeply indented short row must not overflow; the indented line width equals the plain one.
      assert.strictEqual(displayWidth(res.lines[0]), displayWidth(res.lines[1]));
    });
  });

  it('leaves the final column unpadded with trimLastColumn', () => {
    const cols = [col('a', { flex: true, max: 30 }), col('t', { min: 6, max: 12 })];
    const res = renderTable(cols, [data({ a: 'name', t: 'now' })], {
      width: 40,
      margin: 2,
      trimLastColumn: true,
      header: false,
      separator: false,
    });
    assert.ok(res.lines[0].endsWith('now')); // no trailing pad after the last column
  });

  it('width-preservation contract: styled cells keep their allotted width', () => {
    const colorize = (s: string) => `\x1b[36m${s}\x1b[39m`;
    const cols: Column<R>[] = [
      col('a', { flex: true, max: 30, style: (t, _r, w) => colorize(t) + ' '.repeat(Math.max(0, w - displayWidth(t))) }),
      col('b', { max: 10, style: (t, _r, w) => colorize(t) + ' '.repeat(Math.max(0, w - displayWidth(t))) }),
    ];
    const res = renderTable(cols, [data({ a: 'alpha', b: 'beta' }), data({ a: 'a-much-longer-value-here', b: 'x' })], { width: 50, margin: 2 });
    const dataLines = res.lines.slice(2);
    for (const line of dataLines) {
      assert.strictEqual(displayWidth(line), res.layout.totalWidth - 2);
    }
  });
});
