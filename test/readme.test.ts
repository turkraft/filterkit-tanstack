import { describe, it, expect } from 'vitest';
import { toFilterString, toFilterNode } from '../src/index.js';

describe('README examples', () => {
  it('opening example', () => {
    const columnFilters = [
      { id: 'year', value: [2020, 2025] },
      { id: 'status', value: ['active', 'pending'] },
      { id: 'name', value: 'John' },
    ];
    expect(toFilterString(columnFilters))
      .toBe("year between '2020' and '2025' and status in ['active', 'pending'] and name : 'John'");
  });

  it('returns an empty string when nothing is filtered', () => {
    expect(toFilterString([])).toBe('');
  });

  it('declaring how a column filters', () => {
    const filters = [
      { id: 'name', value: 'joh' },
      { id: 'tags', value: ['a', 'b'] },
      { id: 'created', value: ['2024-01-01', '2024-12-31'] },
    ];
    expect(toFilterString(filters, {
      columns: { name: 'contains', tags: 'in', created: 'range' },
      defaultKind: 'auto',
    })).toBe(
      "name ~ '%joh%' and tags in ['a', 'b'] and created between '2024-01-01' and '2024-12-31'"
    );
  });

  it('kind table', () => {
    expect(toFilterString([{ id: 'f', value: 'v' }], { columns: { f: 'equals' } })).toBe("f : 'v'");
    expect(toFilterString([{ id: 'f', value: ['a', 'b'] }], { columns: { f: 'equals' } })).toBe("f in ['a', 'b']");
    expect(toFilterString([{ id: 'f', value: 'v' }], { columns: { f: 'contains' } })).toBe("f ~ '%v%'");
    expect(toFilterString([{ id: 'f', value: 'v' }], { columns: { f: 'startsWith' } })).toBe("f ~ 'v%'");
    expect(toFilterString([{ id: 'f', value: 'v' }], { columns: { f: 'endsWith' } })).toBe("f ~ '%v'");
    expect(toFilterString([{ id: 'f', value: ['a', 'b'] }], { columns: { f: 'in' } })).toBe("f in ['a', 'b']");
    expect(toFilterString([{ id: 'f', value: 'a' }], { columns: { f: 'in' } })).toBe("f : 'a'");
    expect(toFilterString([{ id: 'f', value: [1, 2] }], { columns: { f: 'range' } })).toBe("f between '1' and '2'");
    expect(toFilterString([{ id: 'f', value: { min: 1, max: 2 } }], { columns: { f: 'range' } })).toBe("f between '1' and '2'");
    expect(toFilterString([{ id: 'f', value: { from: 1, to: 2 } }], { columns: { f: 'range' } })).toBe("f between '1' and '2'");
  });

  it('defaultKind applies to unlisted columns', () => {
    expect(toFilterString([{ id: 'x', value: 'v' }], { defaultKind: 'contains' })).toBe("x ~ '%v%'");
  });

  it('auto table', () => {
    expect(toFilterString([{ id: 'status', value: 'active' }])).toBe("status : 'active'");
    expect(toFilterString([{ id: 'age', value: 30 }])).toBe("age : '30'");
    expect(toFilterString([{ id: 'active', value: true }])).toBe("active : 'true'");
    expect(toFilterString([{ id: 'active', value: false }])).toBe("active : 'false'");
    expect(toFilterString([{ id: 'age', value: [18, 65] }])).toBe("age between '18' and '65'");
    expect(toFilterString([{ id: 'age', value: [18, undefined] as any }])).toBe("age >: '18'");
    expect(toFilterString([{ id: 'age', value: [undefined, 65] as any }])).toBe("age <: '65'");
    expect(toFilterString([{ id: 'role', value: ['admin', 'dev'] }])).toBe("role in ['admin', 'dev']");
    expect(toFilterString([{ id: 'f', value: { min: 1, max: 2 } }])).toBe("f between '1' and '2'");
    for (const value of [null, undefined, '', []] as any[]) {
      expect(toFilterString([{ id: 'f', value }])).toBe('');
    }
  });

  it('ranges are normalised', () => {
    expect(toFilterString([{ id: 'age', value: [20, 10] }])).toBe("age between '10' and '20'");
    expect(toFilterString([{ id: 'age', value: [10, 10] }])).toBe("age : '10'");
  });

  it('toFilterNode keeps types', () => {
    const columnFilters = [{ id: 'age', value: 30 }];
    const node = toFilterNode(columnFilters);
    expect(node).toBeDefined();
    expect(toFilterNode([])).toBeUndefined();
  });
});

describe('README: skipped and Date values', () => {
  it('a Date range becomes ISO-8601', () => {
    expect(toFilterString([{ id: 'at', value: [new Date('2024-01-01T00:00:00Z'), new Date('2024-06-01T00:00:00Z')] as any }]))
      .toBe("at between '2024-01-01T00:00:00.000Z' and '2024-06-01T00:00:00.000Z'");
  });

  it('non-operand values are skipped whichever kind is declared', () => {
    for (const kind of ['auto', 'equals', 'contains', 'in', 'range'] as const) {
      expect(toFilterString([{ id: 'f', value: { a: 1 } as any }], { columns: { f: kind } }), kind).toBe('');
    }
    expect(toFilterString([{ id: 'f', value: [['a']] as any }], { columns: { f: 'in' } })).toBe('');
  });
});
