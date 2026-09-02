import { describe, it, expect } from 'vitest';
import { toFilterString, toFilterNode } from '../src/index.js';
import { parse, stringify, matches } from '@turkraft/filterkit';

const backendReads = (s: string) => stringify(parse(s));

describe('per-column filter kinds resolve the shape ambiguity', () => {
  it('a numeric multi-select is an in list, not a range', () => {
    expect(toFilterString([{ id: 'id', value: [10, 20] }], { columns: { id: 'in' } }))
      .toBe("id in ['10', '20']");
    expect(toFilterString([{ id: 'id', value: [10, 20] }]))
      .toBe("id between '10' and '20'");
  });

  it('a date range is a between, not an in list', () => {
    expect(toFilterString([{ id: 'd', value: ['2024-01-01', '2024-12-31'] }], { columns: { d: 'range' } }))
      .toBe("d between '2024-01-01' and '2024-12-31'");
    expect(toFilterString([{ id: 'd', value: ['2024-01-01', '2024-12-31'] }]))
      .toBe("d in ['2024-01-01', '2024-12-31']");
  });

  it('a text column can be a substring match, like TanStack includesString', () => {
    expect(toFilterString([{ id: 'name', value: 'joh' }], { columns: { name: 'contains' } }))
      .toBe("name ~ '%joh%'");
    expect(toFilterString([{ id: 'name', value: 'joh' }], { columns: { name: 'startsWith' } }))
      .toBe("name ~ 'joh%'");
    expect(toFilterString([{ id: 'name', value: 'joh' }], { columns: { name: 'endsWith' } }))
      .toBe("name ~ '%joh'");
  });

  it('defaultKind applies to every unlisted column', () => {
    expect(toFilterString(
      [{ id: 'name', value: 'joh' }, { id: 'city', value: 'ber' }],
      { defaultKind: 'contains' }
    )).toBe("name ~ '%joh%' and city ~ '%ber%'");
  });

  it('columns overrides defaultKind', () => {
    expect(toFilterString(
      [{ id: 'name', value: 'joh' }, { id: 'code', value: 'X1' }],
      { defaultKind: 'contains', columns: { code: 'equals' } }
    )).toBe("name ~ '%joh%' and code : 'X1'");
  });

  it('the default is unchanged for plain values', () => {
    expect(toFilterString([{ id: 'name', value: 'John' }])).toBe("name : 'John'");
    expect(toFilterString([{ id: 'age', value: 30 }])).toBe("age : '30'");
    expect(toFilterString([{ id: 'active', value: true }])).toBe("active : 'true'");
  });
});

describe('ranges', () => {
  it('normalises a reversed range', () => {
    expect(toFilterString([{ id: 'age', value: [20, 10] }]))
      .toBe("age between '10' and '20'");
  });

  it('collapses an empty interval to equality', () => {
    expect(toFilterString([{ id: 'age', value: [10, 10] }])).toBe("age : '10'");
  });

  it('keeps open-ended ranges', () => {
    expect(toFilterString([{ id: 'age', value: [10, undefined] as any }])).toBe("age >: '10'");
    expect(toFilterString([{ id: 'age', value: [undefined, 20] as any }])).toBe("age <: '20'");
  });

  it('accepts object ranges', () => {
    expect(toFilterString([{ id: 'age', value: { min: 10, max: 20 } }]))
      .toBe("age between '10' and '20'");
    expect(toFilterString([{ id: 'd', value: { from: '2024-01-01', to: '2024-12-31' } }]))
      .toBe("d between '2024-01-01' and '2024-12-31'");
    expect(toFilterString([{ id: 'age', value: { min: 10 } }])).toBe("age >: '10'");
  });

  it('drops an empty range', () => {
    expect(toFilterString([{ id: 'age', value: [undefined, undefined] as any }])).toBe('');
    expect(toFilterString([{ id: 'age', value: {} as any }])).toBe('');
  });
});

describe('combining filters', () => {
  it('joins with and, and the result round-trips', () => {
    const expression = toFilterString([
      { id: 'name', value: 'john' },
      { id: 'age', value: [18, 65] },
      { id: 'status', value: ['a', 'b', 'c'] },
    ]);
    expect(expression).toBe("name : 'john' and age between '18' and '65' and status in ['a', 'b', 'c']");
    expect(backendReads(expression)).toBe(expression);
  });

  it('produces nothing when every filter is blank', () => {
    expect(toFilterString([{ id: 'a', value: '' }, { id: 'b', value: [] }])).toBe('');
    expect(toFilterString([])).toBe('');
  });
});

describe('toFilterNode keeps value types', () => {
  it('returns an AST with real numbers', () => {
    const node = toFilterNode([{ id: 'age', value: 30 }]);
    expect(node).toBeDefined();
    expect(matches({ age: 30 }, node!)).toBe(true);
    expect(matches({ age: 31 }, node!)).toBe(false);
    expect(stringify(node!)).toBe("age : '30'");
  });

  it('returns undefined when nothing is filtered', () => {
    expect(toFilterNode([])).toBeUndefined();
  });
});
