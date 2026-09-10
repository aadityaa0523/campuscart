export interface SplitItem {
  userId: string;
  pricePaise: number;
  quantity: number;
}

export interface SplitResult {
  userId: string;
  subtotalPaise: number;
  deliverySharePaise: number;
  totalPaise: number;
}

/**
 * Splits item costs by what each student actually added, then divides the
 * delivery fee proportionally by each student's subtotal share. Paise
 * rounding remainder (from proportional division) is assigned to the
 * largest contributor so the split always sums exactly to the group total —
 * never let per-student rounding silently lose or invent paise.
 */
export function splitCost(items: SplitItem[], deliveryFeePaise = 0): SplitResult[] {
  const subtotalByUser = new Map<string, number>();
  for (const item of items) {
    const line = item.pricePaise * item.quantity;
    subtotalByUser.set(item.userId, (subtotalByUser.get(item.userId) ?? 0) + line);
  }

  const groupSubtotal = [...subtotalByUser.values()].reduce((a, b) => a + b, 0);
  if (groupSubtotal === 0) return [];

  const entries = [...subtotalByUser.entries()];
  const largestUserId = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  let allocatedDelivery = 0;
  const shares = entries.map(([userId, subtotalPaise]) => {
    const share = Math.floor((subtotalPaise / groupSubtotal) * deliveryFeePaise);
    allocatedDelivery += share;
    return { userId, subtotalPaise, deliverySharePaise: share };
  });

  const remainder = deliveryFeePaise - allocatedDelivery;
  const largest = shares.find((s) => s.userId === largestUserId)!;
  largest.deliverySharePaise += remainder;

  return shares.map((s) => ({ ...s, totalPaise: s.subtotalPaise + s.deliverySharePaise }));
}

export function groupTotalPaise(items: SplitItem[], deliveryFeePaise = 0): number {
  return items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0) + deliveryFeePaise;
}
