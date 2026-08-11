import { build, stringify, AndOperator } from '@turkraft/filterkit';
import type { FilterNode } from '@turkraft/filterkit';

type Primitive = string | number | boolean;

export type ColumnFilterValue = Primitive | null | undefined | Primitive[] | [unknown, unknown];

export interface ColumnFilter {
  id: string;
  value: ColumnFilterValue;
}

const andOp = new AndOperator();

function isDefined<T>(v: T | null | undefined): v is T {
  return v != null;
}

function isEmpty(v: unknown): boolean {
  return v === '' || (Array.isArray(v) && v.length === 0);
}

function buildFilter(filter: ColumnFilter): FilterNode | null {
  const { id, value } = filter;
  if (value == null || isEmpty(value)) return null;

  const fb = build();

  if (typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') {
    return fb.field(id).equal(value as any).get();
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.length === 1) {
      return fb.field(id).equal(value[0] as any).get();
    }

    const allStrings = value.every((v): v is string => typeof v === 'string');
    const allNumbers = value.every((v): v is number => typeof v === 'number');
    const allBooleans = value.every((v): v is boolean => typeof v === 'boolean');

    if (value.length === 2 && allNumbers) {
      const [first, second] = value as [number, number];
      if (first === second) {
        return fb.field(id).equal(first as any).get();
      }
      return fb.field(id).between(first as any, second as any).get();
    }

    if (value.length === 2 && allNumbers === false && isDefined(value[0]) && !isDefined(value[1])) {
      return fb.field(id).greaterThanOrEqual(value[0] as any).get();
    }

    if (value.length === 2 && allNumbers === false && !isDefined(value[0]) && isDefined(value[1])) {
      return fb.field(id).lessThanOrEqual(value[1] as any).get();
    }

    if (allStrings || allNumbers || allBooleans) {
      return fb.field(id).in(value as any).get();
    }
  }

  return null;
}

export function toFilterString(filters: ColumnFilter[]): string {
  if (!filters || filters.length === 0) return '';

  const nodes = filters
    .map(buildFilter)
    .filter(isDefined);

  if (nodes.length === 0) return '';
  if (nodes.length === 1) return stringify(nodes[0]);

  const combined = nodes.slice(1).reduce(
    (acc, node) => acc.infix(andOp, node),
    nodes[0]
  );

  return stringify(combined);
}
