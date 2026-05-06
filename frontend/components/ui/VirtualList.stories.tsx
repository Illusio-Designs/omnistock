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

type Row = { id: number; name: string; meta: string };

const data: Row[] = Array.from({ length: 5000 }, (_, i) => ({
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
    getKey: (item) => (item as Row).id,
    renderItem: (item) => {
      const row = item as Row;
      return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0">
          <div>
            <div className="font-semibold text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-500">{row.meta}</div>
          </div>
          <span className="text-xs font-mono text-slate-400">#{row.id}</span>
        </div>
      );
    },
  },
};
