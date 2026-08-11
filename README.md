# FilterKit TanStack

TanStack Table integration for [FilterKit](https://github.com/turkraft/filterkit). Convert TanStack Table column filters to filter expressions for [Spring Filter](https://github.com/turkraft/springfilter) backends.

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

## Value mapping

| TanStack filter value | FilterKit expression |
|---|---|
| `'active'` | `status : 'active'` |
| `30` | `age : '30'` |
| `true` / `false` | `active : 'true'` |
| `[18, 65]` (numbers) | `age between '18' and '65'` |
| `[18, undefined]` | `age >: '18'` |
| `[undefined, 65]` | `age <: '65'` |
| `['admin', 'dev']` (array) | `role in ['admin', 'dev']` |
| `null` / `undefined` / `''` / `[]` | skipped |

Built-in filter function equivalents:

- `equals`, `weakEquals`, `equalsString` → equality
- `inNumberRange` → between / greater-or-equal / less-or-equal
- `arrIncludesSome` / multi-select filters → in collection
- `includesString` → equality (server handles the comparison)

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
