import { describe, it, expect } from 'vitest';
import { toFilterString } from '../src/index.js';
import { FilterParserImpl } from '@turkraft/filterkit';

const strict = new FilterParserImpl(undefined, { strict: true });

describe('emitted expressions are accepted by Spring Filter', () => {
  const cases: Array<[string, any[], any]> = [
    ['plain values', [{ id: 'name', value: 'John' }, { id: 'age', value: 30 }, { id: 'active', value: true }], {}],
    ['range', [{ id: 'age', value: [18, 65] }], {}],
    ['open range', [{ id: 'age', value: [18, undefined] }], {}],
    ['in list', [{ id: 'role', value: ['admin', 'dev'] }], {}],
    ['object range', [{ id: 'd', value: { from: '2024-01-01', to: '2024-12-31' } }], {}],
    ['contains', [{ id: 'name', value: "o'brien" }], { columns: { name: 'contains' } }],
    ['quotes in values', [{ id: 'name', value: "it's \ tricky" }], {}],
    ['combined', [
      { id: 'name', value: 'john' },
      { id: 'age', value: [18, 65] },
      { id: 'status', value: ['a', 'b', 'c'] },
    ], {}],
  ];

  for (const [name, filters, options] of cases) {
    it(name, () => {
      const expression = toFilterString(filters, options);
      expect(expression).not.toBe('');
      expect(() => strict.parse(expression), expression).not.toThrow();
    });
  }
});
