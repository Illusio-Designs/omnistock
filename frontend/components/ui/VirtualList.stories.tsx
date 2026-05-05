import type { Meta, StoryObj } from '@storybook/react';
import { VirtualList } from './VirtualList';

const meta: Meta<typeof VirtualList> = {
  title: 'UI/VirtualList',
  component: VirtualList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Renders only the rows currently in the viewport. Use for any list > 100 rows that fetches all data at once (e.g. channel catalog, audit log, unpaginated vendor list).',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof VirtualList>;

const data = Array.from({ length: 5000 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
  meta: `Lorem ipsum row ${i + 1} payload`,
}));

export const FiveThousandRows: Story = {
  args: {
    items: data,
    estimateSize: 56,
    height: 480,
    className: 'border border-slate-200 rounded-2xl bg-white',
    getKey: (item: { id: number }) => item.id,
    renderItem: (item: { id: number; name: string; meta: string }) => (
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0">
        <div>
          <div className="font-semibold text-slate-900">{item.name}</div>
          <div className="text-xs text-slate-500">{item.meta}</div>
        </div>
        <span className="text-xs font-mono text-slate-400">#{item.id}</span>
      </div>
    ),
  },
};
