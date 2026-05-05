import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('<Modal>', () => {
  it('does not render content when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hi">
        body
      </Modal>
    );
    expect(screen.queryByText('Hi')).not.toBeInTheDocument();
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });

  it('renders title, description, and body when open', () => {
    render(
      <Modal open onClose={() => {}} title="Hi" description="desc">
        body
      </Modal>
    );
    expect(screen.getByText('Hi')).toBeInTheDocument();
    expect(screen.getByText('desc')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('fires onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Hi">
        body
      </Modal>
    );
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
