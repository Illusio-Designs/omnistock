import type { Meta, StoryObj } from '@storybook/react';
import { Loader } from './Loader';

const meta: Meta<typeof Loader> = {
  title: 'UI/Loader',
  component: Loader,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    fullScreen: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: { size: 'md' },
};
export default meta;

type Story = StoryObj<typeof Loader>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { label: 'Loading dashboard…' },
};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg', label: 'Booting up…' } };
