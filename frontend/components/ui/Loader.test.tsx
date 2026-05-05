import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loader } from './Loader';

describe('<Loader>', () => {
  it('exposes role=status with an aria-label', () => {
    render(<Loader />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
  });

  it('uses the custom label when provided', () => {
    render(<Loader label="Fetching products" />);
    expect(screen.getByText('Fetching products')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching products');
  });

  it('renders an sr-only fallback when no visible label', () => {
    render(<Loader />);
    // The visually-hidden span is announced to screen readers.
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });
});
