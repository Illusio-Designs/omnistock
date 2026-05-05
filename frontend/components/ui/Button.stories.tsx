import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Plus, ArrowRight } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'outline'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'icon'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Danger: Story = { args: { variant: 'danger', children: 'Delete' } };

export const Loading: Story = { args: { loading: true, children: 'Saving…' } };

export const WithIcons: Story = {
  args: {
    leftIcon: <Plus size={14} />,
    rightIcon: <ArrowRight size={14} />,
    children: 'Add product',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
};
