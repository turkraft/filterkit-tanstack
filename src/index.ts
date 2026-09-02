import { build, stringify, AndOperator } from '@turkraft/filterkit';
import type { FilterNode } from '@turkraft/filterkit';

type Primitive = string | number | boolean;

export type ColumnFilterValue =
  | Primitive
  | null
  | undefined
  | Primitive[]
  | [unknown, unknown]
  | { min?: unknown; max?: unknown }
  | { from?: unknown; to?: unknown };

export interface ColumnFilter {
  id: string;
  value: ColumnFilterValue;
}

export type ColumnFilterKind =
  | 'auto'
  | 'equals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'range';

export interface ToFilterStringOptions {
  columns?: Record<string, ColumnFilterKind>;
  defaultKind?: ColumnFilterKind;
}

const andOp = new AndOperator();

function isDefined<T>(v: T | null | undefined): v is T {
  return v != null;
}

function isBlank(v: unknown): boolean {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}

function isOperand(v: unknown): v is Primitive | Date {
  return typeof v === 'string' || typeof v === 'number' ||
    typeof v === 'boolean' || v instanceof Date;
}

function toRangeBounds(value: unknown): [unknown, unknown] | null {
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return [value[0], value.length > 1 ? value[1] : undefined];
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('min' in record || 'max' in record) return [record.min, record.max];
    if ('from' in record || 'to' in record) return [record.from, record.to];
  }
  return null;
}

function comparable(a: unknown, b: unknown): number | null {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return null;
}

function buildRange(id: string, value: unknown): FilterNode | null {
  const bounds = toRangeBounds(value);
  if (!bounds) return null;

  let [lower, upper] = bounds;
  if (isBlank(lower) && isBlank(upper)) return null;
  if (!isBlank(lower) && !isOperand(lower)) return null;
  if (!isBlank(upper) && !isOperand(upper)) return null;

  const fb = build();
  if (isBlank(upper)) return fb.field(id).greaterThanOrEqual(lower as any).get();
  if (isBlank(lower)) return fb.field(id).lessThanOrEqual(upper as any).get();

  const order = comparable(lower, upper);
  if (order !== null && order > 0) [lower, upper] = [upper, lower];
  if (order === 0) return fb.field(id).equal(lower as any).get();

  return fb.field(id).between(lower as any, upper as any).get();
}

function buildIn(id: string, value: unknown): FilterNode | null {
  const items = (Array.isArray(value) ? value : [value])
    .filter(v => !isBlank(v))
    .filter(isOperand);
  if (items.length === 0) return null;
  const fb = build();
  if (items.length === 1) return fb.field(id).equal(items[0] as any).get();
  return fb.field(id).in(items as any).get();
}

function buildLike(id: string, value: unknown, kind: 'contains' | 'startsWith' | 'endsWith'): FilterNode | null {
  if (isBlank(value) || !isOperand(value)) return null;
  const fb = build();
  const text = String(value);
  if (kind === 'contains') return fb.field(id).contains(text).get();
  if (kind === 'startsWith') return fb.field(id).startsWith(text).get();
  return fb.field(id).endsWith(text).get();
}

function buildEquals(id: string, value: unknown): FilterNode | null {
  if (isBlank(value)) return null;
  if (Array.isArray(value)) return buildIn(id, value);
  if (!isOperand(value)) return null;
  return build().field(id).equal(value as any).get();
}

function buildAuto(id: string, value: ColumnFilterValue): FilterNode | null {
  if (isBlank(value)) return null;

  if (typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') {
    return buildEquals(id, value);
  }

  if (Array.isArray(value)) {
    if (value.length === 1) return buildEquals(id, value[0]);

    const allNumbers = value.every((v): v is number => typeof v === 'number');
    const allDates = value.every((v): v is Date => v instanceof Date);
    const oneSided = value.length === 2 && isDefined(value[0]) !== isDefined(value[1]);

    if ((value.length === 2 && (allNumbers || allDates)) || oneSided) {
      return buildRange(id, value);
    }

    const allStrings = value.every((v): v is string => typeof v === 'string');
    const allBooleans = value.every((v): v is boolean => typeof v === 'boolean');
    if (allStrings || allNumbers || allBooleans) return buildIn(id, value);
    return null;
  }

  return toRangeBounds(value) ? buildRange(id, value) : null;
}

function buildFilter(filter: ColumnFilter, options: ToFilterStringOptions): FilterNode | null {
  const { id, value } = filter;
  const kind = options.columns?.[id] ?? options.defaultKind ?? 'auto';

  switch (kind) {
    case 'equals': return buildEquals(id, value);
    case 'contains':
    case 'startsWith':
    case 'endsWith': return buildLike(id, value, kind);
    case 'in': return buildIn(id, value);
    case 'range': return buildRange(id, value);
    default: return buildAuto(id, value);
  }
}

export function toFilterString(
  filters: ColumnFilter[],
  options: ToFilterStringOptions = {}
): string {
  const node = toFilterNode(filters, options);
  return node === undefined ? '' : stringify(node);
}

export function toFilterNode(
  filters: ColumnFilter[],
  options: ToFilterStringOptions = {}
): FilterNode | undefined {
  if (!filters || filters.length === 0) return undefined;

  const nodes = filters
    .map(f => buildFilter(f, options))
    .filter(isDefined);

  if (nodes.length === 0) return undefined;
  return nodes.slice(1).reduce((acc, node) => acc.infix(andOp, node), nodes[0]);
}
