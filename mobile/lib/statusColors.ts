type BadgeVariant = 'emerald' | 'rose' | 'slate' | 'amber' | 'sky' | 'violet';

export function orderStatusVariant(status?: string): BadgeVariant {
  switch ((status || '').toUpperCase()) {
    case 'DELIVERED':
    case 'COMPLETED':
    case 'PAID':
    case 'RECEIVED':
    case 'CONNECTED':
    case 'ACTIVE':
      return 'emerald';
    case 'CANCELLED':
    case 'FAILED':
    case 'RETURNED':
    case 'OVERDUE':
    case 'SUSPENDED':
      return 'rose';
    case 'PENDING':
    case 'PROCESSING':
    case 'CONFIRMED':
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
    case 'PARTIALLY_RECEIVED':
    case 'UNPAID':
      return 'amber';
    case 'SHIPPED':
    case 'SENT':
    case 'PARTIALLY_PAID':
    case 'TRIALING':
      return 'sky';
    case 'DRAFT':
    default:
      return 'slate';
  }
}
