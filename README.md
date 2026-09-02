# FilterKit TanStack

TanStack Table integration for [FilterKit](https://github.com/turkraft/filterkit). Turn TanStack Table column filters into a filter expression you can send to your API.

```ts
import { toFilterString } from '@turkraft/filterkit-tanstack';

const columnFilters = [
  { id: 'year', value: [2020, 2025] },
  { id: 'status', value: ['active', 'pending'] },
  { id: 'name', value: 'John' },
];

const query = toFilterString(columnFilters);
// => year between '2020' and '2025' and status in ['active', 'pending'] and name : 'John'

fetch(`/api/cars?filter=${encodeURIComponent(query)}`);
```

## Install

```bash
npm install @turkraft/filterkit-tanstack @turkraft/filterkit
```

## Ecosystem

See the other FilterKit integrations:

- [QueryBuilder](https://github.com/turkraft/filterkit-querybuilder) — react-querybuilder
- [Prisma](https://github.com/turkraft/filterkit-prisma) — Prisma where clauses
- [Drizzle](https://github.com/turkraft/filterkit-drizzle) — Drizzle where clauses

## Usage

```ts
import { toFilterString } from '@turkraft/filterkit-tanstack';

const table = useReactTable({
  data,
  columns,
  state: { columnFilters },
  onColumnFiltersChange: setColumnFilters,
  manualFiltering: true,
});

const filterQuery = toFilterString(columnFilters);
const response = await fetch(`/api/data?filter=${encodeURIComponent(filterQuery)}`);
```

`toFilterString` returns `''` when nothing is filtered — that means "no filter", so
do not send it as an empty `filter=` parameter without checking.

## Declaring how a column filters

A column filter value alone is often ambiguous. `[10, 20]` could be a numeric range
or a two-item multi-select; `['2024-01-01', '2024-12-31']` could be a date range or
a two-item multi-select. Declare the columns where it matters:

```ts
toFilterString(columnFilters, {
  columns: {
    name: 'contains',   // text search      -> name ~ '%joh%'
    tags: 'in',         // multi-select     -> tags in ['a', 'b']
    created: 'range',   // date range       -> created between '...' and '...'
  },
  defaultKind: 'auto',  // for every other column
});
```

| Kind | Value shape | Expression |
|---|---|---|
| `equals` | anything (arrays become `in`) | `field : 'value'` |
| `contains` | string | `field ~ '%value%'` |
| `startsWith` | string | `field ~ 'value%'` |
| `endsWith` | string | `field ~ '%value'` |
| `in` | array (or a single value) | `field in ['a', 'b']` |
| `range` | `[lo, hi]`, `{ min, max }`, `{ from, to }` | `field between 'lo' and 'hi'` |
| `auto` (default) | guessed from the value | see below |

`defaultKind` applies to every column with no entry in `columns`.

### `auto`

| TanStack filter value | FilterKit expression |
|---|---|
| `'active'` | `status : 'active'` |
| `30` | `age : '30'` |
| `true` / `false` | `active : 'true'` |
| `[18, 65]` (two numbers) | `age between '18' and '65'` |
| `[18, undefined]` | `age >: '18'` |
| `[undefined, 65]` | `age <: '65'` |
| `['admin', 'dev']` (array) | `role in ['admin', 'dev']` |
| `{ min, max }` / `{ from, to }` | `field between 'min' and 'max'` |
| `[new Date(a), new Date(b)]` | `at between '...' and '...'` (ISO-8601) |
| `null` / `undefined` / `''` / `[]` | skipped |
| a plain object with no range keys | skipped |

Ranges are normalised: `[20, 10]` becomes `between '10' and '20'`, and `[10, 10]`
becomes `age : '10'`. `Date` values are emitted as ISO-8601.

A value that is not a string, number, boolean or `Date` — a plain object, or a
nested array — cannot become a filter operand and is skipped rather than
stringified into a nonsense filter. This applies whichever kind is declared.

### Built-in filter function equivalents

- `equals`, `weakEquals`, `equalsString` → `'equals'` (the `auto` default)
- `inNumberRange` → `'range'` (`auto` also gets this right for two numbers)
- `arrIncludesSome` / multi-select → `'in'` (declare it if the value can be two numbers)
- `includesString`, `includesStringSensitive` → **declare `'contains'`**; `auto`
  emits an equality test, which is not a substring match on the server either

## Keeping value types

`toFilterNode` returns the AST instead of a string, which preserves JavaScript
types — useful when feeding an ORM adapter rather than an HTTP request:

```ts
import { toFilterNode } from '@turkraft/filterkit-tanstack';
import { toPrismaWhere } from '@turkraft/filterkit-prisma';

const node = toFilterNode(columnFilters);
const where = node ? toPrismaWhere(node) : {};
```

`toFilterString` quotes every value; a server that knows each field's type converts
them back, but an ORM adapter cannot.

## Sending it to a Spring Boot API

The expression syntax matches [Spring Filter](https://github.com/turkraft/springfilter),
so the string this package produces can go straight into a `filter=` parameter on a
Spring Boot endpoint. Nothing here depends on that — any API that understands the
syntax works the same way.

## [Sponsors](https://github.com/sponsors/torshid)

Sponsor our project and have your issues prioritized.

<table>
<tr>
<td align="center"><a href="https://github.com/ixorbv"><img width="64" src="https://avatars.githubusercontent.com/u/127401397?v=4"/><br/>ixorbv</a></td>
<td align="center"><a href="https://github.com/marcopag90"><img width="64" src="https://avatars.githubusercontent.com/marcopag90"/><br/>marcopag90</a></td>
</tr>
</table>

## License

MIT
