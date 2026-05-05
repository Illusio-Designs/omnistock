'use client';

// Lightweight wrapper around @tanstack/react-virtual. Use for any list/table
// that renders > 100 rows in one viewport (e.g. the channel catalog at 169
// entries, an unpaginated vendor or warehouse list, audit logs).
//
// Paginated tables that fetch a fixed page size (orders, products, etc.) do
// NOT need this — the network round-trip is the bottleneck, not the DOM.

import { useRef, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualListProps<T> {
  items: T[];
  estimateSize: number | ((index: number) => number);
  overscan?: number;
  height?: number | string;
  className?: string;
  getKey?: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
}

export function VirtualList<T>({
  items,
  estimateSize,
  overscan = 8,
  height = 600,
  className,
  getKey,
  renderItem,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: typeof estimateSize === 'number' ? () => estimateSize : estimateSize,
    overscan,
    getItemKey: getKey ? (i) => getKey(items[i], i) : undefined,
  });

  return (
    <div
      ref={parentRef}
      className={className}
      style={{ height, overflow: 'auto', contain: 'strict' }}
      role="list"
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((vRow) => {
          const item = items[vRow.index];
          return (
            <div
              key={vRow.key}
              role="listitem"
              data-index={vRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              {renderItem(item, vRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
