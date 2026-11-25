'use client';

export type SortDir = 'asc' | 'desc';

/**
 * A table header cell that sorts by its column. Clicking an unsorted column
 * sorts it ascending; clicking the sorted column flips the direction. The
 * arrow shows the current direction; unsorted columns show a faint pair.
 */
export default function SortHeader({
  label, column, sort, dir, onSort, align = 'left', className = '',
}: {
  label: string;
  column: string;
  sort: string;
  dir: SortDir;
  onSort: (column: string, dir: SortDir) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  const active = sort === column;
  const next: SortDir = active && dir === 'asc' ? 'desc' : 'asc';
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  return (
    <th
      className={`px-4 py-3 text-${align} ${className}`}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(column, next)}
        className={`inline-flex w-full items-center gap-1 ${justify} font-semibold hover:text-gray-900 ${active ? 'text-gray-900' : ''}`}
        title={`Sort by ${label.toLowerCase()}`}
      >
        {label}
        <span aria-hidden="true" className={`text-[10px] leading-none ${active ? 'text-green-700' : 'text-gray-300'}`}>
          {active ? (dir === 'asc' ? '▲' : '▼') : '▲▼'}
        </span>
      </button>
    </th>
  );
}
