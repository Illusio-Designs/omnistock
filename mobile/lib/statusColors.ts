type BadgeVariant = 'emerald' | 'rose' | 'slate' | 'amber';

export function orderStatusVariant(status?: string): BadgeVariant {
  switch ((status || '').toUpperCase()) {
    case 'DELIVERED':
    case 'COMPLETED':
    case 'PAID':
      return 'emerald';
    case 'CANCELLED':
    case 'FAILED':
    case 'RETURNED':
      return 'rose';
    case 'PENDING':
    case 'PROCESSING':
    case 'CONFIRMED':
      return 'amber';
    default:
      return 'slate';
  }
}
