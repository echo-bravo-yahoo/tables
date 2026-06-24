/**
 * computeLayout tests, migrated from c's util/layout.test.ts and re-expressed
 * against generic Column[] (ID and Name are separate columns; the GUTTER is the
 * `margin` option). Expected numbers match the original session layout.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeLayout, type Column } from '../src/layout.ts';

type Row = Record<string, string>;
const v = (key: string) => (r: Row) => r[key] ?? '';

// Mirrors c's SESSION_COLUMNS layout parameters (idName split into id + name).
const COLUMNS: Column<Row>[] = [
  { key: 'id', label: 'ID', value: v('id'), min: 12, max: 12, priority: 2 },
  { key: 'name', label: 'Name', value: v('name'), min: 8, max: Infinity, priority: 2, flex: true },
  { key: 'status', label: 'State', value: v('status'), min: 7, max: 9, priority: 1 },
  { key: 'repo', label: 'Repo', value: v('repo'), min: 6, max: 20, priority: 3 },
  { key: 'branch', label: 'Worktree/Branch', value: v('branch'), min: 6, max: 30, priority: 4 },
  { key: 'time', label: 'Last Active', value: v('time'), min: 6, max: 12, priority: 5 },
  { key: 'cost', label: 'Cost', value: v('cost'), min: 5, max: 8, priority: 6 },
  { key: 'usage', label: 'Usage', value: v('usage'), min: 4, max: 6, priority: 7 },
  { key: 'size', label: 'Size', value: v('size'), min: 7, max: 10, priority: 8 },
  { key: 'resources', label: 'Resources', value: v('resources'), min: 4, max: 24, priority: 9 },
];

const GUTTER = 2;
const ALL_MIN = COLUMNS.reduce((sum, c) => sum + c.min, 0); // 65

const empty = () => new Map<string, number>();
const widths = (entries: Record<string, number>) => new Map(Object.entries(entries));
const layout = (content: Map<string, number>, width: number) =>
  computeLayout(COLUMNS, content, width, { margin: GUTTER });
const w = (l: ReturnType<typeof layout>, key: string) => l.widths.get(key) ?? 0;

describe('computeLayout', () => {
  it('shows all columns at wide terminal', () => {
    const l = layout(empty(), 200);
    assert.strictEqual(l.visible.size, COLUMNS.length);
    for (const c of COLUMNS) assert.ok(l.visible.has(c.key), `${c.key} visible`);
  });

  it('assigns minimums at tight fit', () => {
    const l = layout(empty(), ALL_MIN + GUTTER);
    assert.strictEqual(l.visible.size, COLUMNS.length);
    assert.strictEqual(w(l, 'status'), 7);
    assert.strictEqual(w(l, 'id') + w(l, 'name'), 20);
    assert.strictEqual(w(l, 'repo'), 6);
    assert.strictEqual(w(l, 'branch'), 6);
    assert.strictEqual(w(l, 'time'), 6);
    assert.strictEqual(w(l, 'cost'), 5);
    assert.strictEqual(w(l, 'usage'), 4);
    assert.strictEqual(w(l, 'size'), 7);
    assert.strictEqual(w(l, 'resources'), 4);
  });

  it('drops lowest-priority column first', () => {
    const l = layout(empty(), ALL_MIN + GUTTER - 1);
    assert.ok(!l.visible.has('resources'));
    assert.strictEqual(l.visible.size, COLUMNS.length - 1);
  });

  it('multiple columns drop progressively', () => {
    // status(7) + id(12) + name(8) + repo(6) + gutter(2) = 35
    const l = layout(empty(), 35);
    assert.ok(l.visible.has('status'));
    assert.ok(l.visible.has('id'));
    assert.ok(l.visible.has('name'));
    assert.ok(l.visible.has('repo'));
    assert.ok(!l.visible.has('branch'));
    assert.ok(!l.visible.has('time'));
    assert.ok(!l.visible.has('cost'));
    assert.ok(!l.visible.has('usage'));
    assert.ok(!l.visible.has('size'));
    assert.ok(!l.visible.has('resources'));
  });

  it('keeps only status + id + name at extreme narrow', () => {
    // status(7) + id(12) + name(8) + gutter(2) = 29
    const l = layout(empty(), 29);
    assert.strictEqual(l.visible.size, 3);
    assert.ok(l.visible.has('status'));
    assert.ok(l.visible.has('id'));
    assert.ok(l.visible.has('name'));
  });

  it('ID is always 12', () => {
    const l = layout(empty(), 200);
    assert.strictEqual(w(l, 'id'), 12);
  });

  it('allocates leftover id/name space to name', () => {
    assert.strictEqual(w(layout(empty(), 200), 'id') + w(layout(empty(), 200), 'name'), 20);
    const l2 = layout(widths({ name: 48 }), 200); // name content 48 → id+name 60
    assert.strictEqual(w(l2, 'id') + w(l2, 'name'), 60);
  });

  it('expands higher-priority columns first', () => {
    const content = widths({
      status: 9, name: 32, repo: 20, branch: 30, time: 12, cost: 8, usage: 5, size: 9, resources: 24,
    });
    const l = layout(content, ALL_MIN + GUTTER + 10);
    // status expands first (pri 1): 7 → 9 (grow 2). remaining 8.
    assert.strictEqual(w(l, 'status'), 9);
    // name expands next (pri 2, flex): 8 → 16 (grow min(24, 8)). id+name = 28.
    assert.strictEqual(w(l, 'id') + w(l, 'name'), 28);
    assert.strictEqual(w(l, 'repo'), 6);
    assert.strictEqual(w(l, 'branch'), 6);
  });

  it('never shrinks below minimum', () => {
    const l = layout(widths({ repo: 2, branch: 1 }), ALL_MIN + GUTTER);
    assert.ok(w(l, 'repo') >= 6);
    assert.ok(w(l, 'branch') >= 6);
  });

  it('respects column maximums', () => {
    const content = widths({
      status: 50, name: 100, repo: 100, branch: 100, time: 100, cost: 100, usage: 100, size: 100, resources: 100,
    });
    const l = layout(content, 500);
    assert.ok(w(l, 'status') <= 9);
    assert.strictEqual(w(l, 'id') + w(l, 'name'), 112); // id 12 + name to content 100
    assert.ok(w(l, 'repo') <= 20);
    assert.ok(w(l, 'branch') <= 30);
    assert.ok(w(l, 'time') <= 12);
    assert.ok(w(l, 'cost') <= 8);
    assert.ok(w(l, 'usage') <= 6);
    assert.ok(w(l, 'size') <= 10);
    assert.ok(w(l, 'resources') <= 24);
  });

  it('gives leftover to the flex (name) column', () => {
    const content = widths({
      status: 7, name: 48, repo: 6, branch: 6, time: 6, cost: 5, usage: 4, size: 5, resources: 4,
    });
    const l = layout(content, ALL_MIN + GUTTER + 50);
    assert.strictEqual(w(l, 'id') + w(l, 'name'), 60);
  });

  it('totalWidth equals sum of allocated widths + margin', () => {
    const l = layout(empty(), 200);
    const sum = COLUMNS.reduce((s, c) => s + w(l, c.key), 0);
    assert.strictEqual(l.totalWidth, sum + GUTTER);
  });

  it('totalWidth correct when columns are dropped', () => {
    const l = layout(empty(), 29);
    const sum = w(l, 'id') + w(l, 'name') + w(l, 'status');
    assert.strictEqual(l.totalWidth, sum + GUTTER);
    assert.strictEqual(w(l, 'repo'), 0);
    assert.strictEqual(w(l, 'time'), 0);
  });

  describe('usage column', () => {
    it('is visible when the terminal is wide enough', () => {
      assert.ok(layout(widths({ usage: 5 }), 200).visible.has('usage'));
    });
    it('drops before cost', () => {
      // status7 + id12 + name8 + repo6 + branch6 + time6 + cost5 + gutter2 = 52
      const l = layout(empty(), 52);
      assert.ok(!l.visible.has('usage'));
      assert.ok(l.visible.has('cost'));
    });
    it('width stays between min and max', () => {
      const l = layout(widths({ usage: 5 }), 200);
      assert.ok(w(l, 'usage') >= 4 && w(l, 'usage') <= 6);
    });
  });

  describe('cost column', () => {
    it('is visible when the terminal is wide enough', () => {
      assert.ok(layout(widths({ cost: 7 }), 200).visible.has('cost'));
    });
    it('drops before higher-priority columns', () => {
      // status7 + id12 + name8 + repo6 + branch6 + time6 + gutter2 = 47
      const l = layout(empty(), 47);
      assert.ok(!l.visible.has('cost'));
      assert.ok(l.visible.has('time'));
    });
    it('width stays between min and max', () => {
      const l = layout(widths({ cost: 7 }), 200);
      assert.ok(w(l, 'cost') >= 5 && w(l, 'cost') <= 8);
    });
  });
});
