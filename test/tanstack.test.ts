import { describe, it, expect } from 'vitest';
import { toFilterString, type ColumnFilter } from '../src/index.js';

describe('toFilterString', () => {
  it('empty array returns empty string', () => {
    expect(toFilterString([])).toBe('');
  });

  it('single string equality', () => {
    expect(toFilterString([{ id: 'status', value: 'active' }]))
      .toBe("status : 'active'");
  });

  it('single number equality', () => {
    expect(toFilterString([{ id: 'age', value: 30 }]))
      .toBe("age : '30'");
  });

  it('boolean equality', () => {
    expect(toFilterString([{ id: 'active', value: true }]))
      .toBe("active : 'true'");
    expect(toFilterString([{ id: 'deleted', value: false }]))
      .toBe("deleted : 'false'");
  });

  it('multiple filters combined with AND', () => {
    expect(toFilterString([
      { id: 'status', value: 'active' },
      { id: 'age', value: 30 },
    ])).toBe("status : 'active' and age : '30'");
  });

  it('range [min, max] becomes between', () => {
    expect(toFilterString([{ id: 'age', value: [18, 65] }]))
      .toBe("age between '18' and '65'");
  });

  it('range with only min becomes greater-or-equal', () => {
    expect(toFilterString([{ id: 'age', value: [18, undefined] }]))
      .toBe("age >: '18'");
  });

  it('range with only max becomes less-or-equal', () => {
    expect(toFilterString([{ id: 'age', value: [undefined, 65] }]))
      .toBe("age <: '65'");
  });

  it('array of strings becomes in collection', () => {
    expect(toFilterString([{ id: 'role', value: ['admin', 'dev'] }]))
      .toBe("role in ['admin', 'dev']");
  });

  it('array of numbers becomes in collection', () => {
    expect(toFilterString([{ id: 'level', value: [1, 2, 3] }]))
      .toBe("level in ['1', '2', '3']");
  });

  it('array of booleans becomes in collection', () => {
    expect(toFilterString([{ id: 'flag', value: [true, false] }]))
      .toBe("flag in ['true', 'false']");
  });

  it('array with one item becomes equality', () => {
    expect(toFilterString([{ id: 'role', value: ['admin'] }]))
      .toBe("role : 'admin'");
  });

  it('range with equal min and max becomes equality', () => {
    expect(toFilterString([{ id: 'age', value: [30, 30] }]))
      .toBe("age : '30'");
  });

  it('null value skipped', () => {
    expect(toFilterString([{ id: 'status', value: null }])).toBe('');
  });

  it('undefined value skipped', () => {
    expect(toFilterString([{ id: 'status', value: undefined }])).toBe('');
  });

  it('empty string value skipped', () => {
    expect(toFilterString([{ id: 'status', value: '' }])).toBe('');
  });

  it('empty array value skipped', () => {
    expect(toFilterString([{ id: 'role', value: [] }])).toBe('');
  });

  it('mixed valid and skipped filters', () => {
    expect(toFilterString([
      { id: 'a', value: null },
      { id: 'b', value: 'hello' },
      { id: 'c', value: '' },
      { id: 'd', value: 42 },
    ])).toBe("b : 'hello' and d : '42'");
  });

  it('nested field names preserved', () => {
    expect(toFilterString([{ id: 'user.name', value: 'john' }]))
      .toBe("user.name : 'john'");
  });

  it('decimal numbers in range', () => {
    expect(toFilterString([{ id: 'price', value: [9.99, 99.99] }]))
      .toBe("price between '9.99' and '99.99'");
  });

  it('string containing single quote is handled', () => {
    expect(toFilterString([{ id: 'name', value: "O'Brien" }]))
      .toBe("name : 'O\\'Brien'");
  });

  it('all filter types together', () => {
    expect(toFilterString([
      { id: 'age', value: [18, 65] },
      { id: 'status', value: ['active', 'pending'] },
      { id: 'name', value: 'John' },
      { id: 'deleted', value: false },
    ])).toBe("age between '18' and '65' and status in ['active', 'pending'] and name : 'John' and deleted : 'false'");
  });
});
