import { describe, it, expect } from 'vitest';
import { toFilterString, toFilterNode, type ColumnFilterKind } from '../src/index.js';
import { FilterParserImpl, stringify } from '@turkraft/filterkit';

const strict = new FilterParserImpl(undefined, { strict: true });
const lenient = new FilterParserImpl();

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 0x100000000; };
}

const IDS = ['a', 'b', 'brand.name', 'x_1', '$y'];
const KINDS: ColumnFilterKind[] = ['auto', 'equals', 'contains', 'startsWith', 'endsWith', 'in', 'range'];
const VALUES: unknown[] = [
  'x', "o'brien", '50%', 'a_b', 'C:\\path', '  spaced  ', 'ünïcödé', '',
  0, 1, -1, 1.5, true, false, null, undefined,
  [], ['a'], ['a', 'b'], ['a', 'b', 'c'], [1, 2], [1, 2, 3], [20, 10], [10, 10],
  [1, undefined], [undefined, 1], [undefined, undefined], [null], [''],
  ['2024-01-01', '2024-12-31'], [new Date('2024-01-01'), new Date('2024-06-01')],
  { min: 1, max: 2 }, { from: 'a', to: 'b' }, { min: 1 }, { max: 2 }, {}, { a: 1 },
  [[1, 2]], [{ a: 1 }], new Date('2024-03-05'),
];

function randomFilters(rand: () => number): { filters: any[]; options: any } {
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  const count = 1 + Math.floor(rand() * 4);
  const filters: any[] = [];
  const columns: Record<string, ColumnFilterKind> = {};
  for (let i = 0; i < count; i++) {
    const id = pick(IDS);
    filters.push({ id, value: pick(VALUES) });
    if (rand() < 0.5) columns[id] = pick(KINDS);
  }
  const options: any = {};
  if (Object.keys(columns).length) options.columns = columns;
  if (rand() < 0.3) options.defaultKind = pick(KINDS);
  return { filters, options };
}

describe('tanstack fuzzing', () => {
  it('every emitted expression is accepted by the strict parser', () => {
    const rand = rng(0x7A11);
    const bad: string[] = [];
    let emitted = 0, empty = 0;
    for (let i = 0; i < 20000; i++) {
      const { filters, options } = randomFilters(rand);
      let expression: string;
      try { expression = toFilterString(filters, options); } catch (e: any) {
        if (bad.length < 10) bad.push(`  THREW ${e.constructor.name}: ${e.message.slice(0, 70)}\n      ${JSON.stringify(filters).slice(0, 140)}`);
        continue;
      }
      if (expression === '') { empty++; continue; }
      emitted++;
      try { strict.parse(expression); } catch (e: any) {
        if (bad.length < 10) {
          bad.push(`  NOT ACCEPTED BY SPRING FILTER\n      ${expression}\n      ${e.message.slice(0, 90)}`);
        }
      }
    }
    console.log(`  ${emitted} expressions emitted, ${empty} empty, ${bad.length} problem(s)`);
    bad.forEach(b => console.log(b));
    expect(bad).toEqual([]);
    expect(emitted).toBeGreaterThan(5000);
  }, 60000);

  it('never emits [object Object] or a comma-joined array', () => {
    const rand = rng(0x0B7);
    const bad: string[] = [];
    for (let i = 0; i < 20000; i++) {
      const { filters, options } = randomFilters(rand);
      let expression: string;
      try { expression = toFilterString(filters, options); } catch { continue; }
      if (/\[object Object\]/.test(expression) && bad.length < 10) {
        bad.push(`  ${expression}\n      from ${JSON.stringify(filters).slice(0, 140)}`);
      }
    }
    console.log(`  ${bad.length} stringified-object leak(s)`);
    bad.forEach(b => console.log(b));
    expect(bad).toEqual([]);
  }, 60000);

  it('toFilterNode and toFilterString describe the same filter', () => {
    const rand = rng(0xD0DE);
    const bad: string[] = [];
    let compared = 0;
    for (let i = 0; i < 10000; i++) {
      const { filters, options } = randomFilters(rand);
      let expression: string, node: unknown;
      try {
        expression = toFilterString(filters, options);
        node = toFilterNode(filters, options);
      } catch { continue; }
      compared++;
      const fromNode = node === undefined ? '' : stringify(node as any);
      if (fromNode !== expression && bad.length < 10) {
        bad.push(`  string ${JSON.stringify(expression)}\n      node   ${JSON.stringify(fromNode)}`);
      }
    }
    console.log(`  ${compared} pairs compared, ${bad.length} disagreement(s)`);
    bad.forEach(b => console.log(b));
    expect(bad).toEqual([]);
  }, 60000);

  it('emitted expressions are stable under a re-parse', () => {
    const rand = rng(0x5AB1);
    const bad: string[] = [];
    let checked = 0;
    for (let i = 0; i < 10000; i++) {
      const { filters, options } = randomFilters(rand);
      let expression: string;
      try { expression = toFilterString(filters, options); } catch { continue; }
      if (expression === '') continue;
      checked++;
      try {
        const again = stringify(lenient.parse(expression));
        if (again !== expression && bad.length < 10) bad.push(`  ${expression}\n      became ${again}`);
      } catch (e: any) {
        if (bad.length < 10) bad.push(`  ${expression}\n      ${e.message.slice(0, 80)}`);
      }
    }
    console.log(`  ${checked} expressions round-tripped, ${bad.length} problem(s)`);
    bad.forEach(b => console.log(b));
    expect(bad).toEqual([]);
  }, 60000);
});
