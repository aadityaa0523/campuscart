import { describe, it, expect } from "vitest";
import { splitCost, groupTotalPaise } from "../../src/lib/splitting.js";

describe("splitCost", () => {
  it("splits item subtotals per user with no delivery fee", () => {
    const result = splitCost([
      { userId: "A", pricePaise: 4500, quantity: 1 },
      { userId: "B", pricePaise: 5500, quantity: 1 },
    ]);
    expect(result).toEqual([
      { userId: "A", subtotalPaise: 4500, deliverySharePaise: 0, totalPaise: 4500 },
      { userId: "B", subtotalPaise: 5500, deliverySharePaise: 0, totalPaise: 5500 },
    ]);
  });

  it("sums multiple line items per user", () => {
    const result = splitCost([
      { userId: "A", pricePaise: 1000, quantity: 2 },
      { userId: "A", pricePaise: 500, quantity: 1 },
    ]);
    expect(result).toEqual([{ userId: "A", subtotalPaise: 2500, deliverySharePaise: 0, totalPaise: 2500 }]);
  });

  it("splits delivery fee proportionally and the remainder never goes missing", () => {
    // 3 users, delivery fee that doesn't divide evenly
    const result = splitCost(
      [
        { userId: "A", pricePaise: 3333, quantity: 1 },
        { userId: "B", pricePaise: 3333, quantity: 1 },
        { userId: "C", pricePaise: 3334, quantity: 1 },
      ],
      1000,
    );
    const totalDelivery = result.reduce((sum, r) => sum + r.deliverySharePaise, 0);
    expect(totalDelivery).toBe(1000);
    const grandTotal = result.reduce((sum, r) => sum + r.totalPaise, 0);
    expect(grandTotal).toBe(3333 + 3333 + 3334 + 1000);
  });

  it("gives the rounding remainder to the largest contributor", () => {
    const result = splitCost(
      [
        { userId: "small", pricePaise: 100, quantity: 1 },
        { userId: "big", pricePaise: 900, quantity: 1 },
      ],
      99,
    );
    const big = result.find((r) => r.userId === "big")!;
    const small = result.find((r) => r.userId === "small")!;
    expect(big.deliverySharePaise).toBeGreaterThan(small.deliverySharePaise);
    expect(big.deliverySharePaise + small.deliverySharePaise).toBe(99);
  });

  it("returns an empty split for no items", () => {
    expect(splitCost([])).toEqual([]);
  });
});

describe("groupTotalPaise", () => {
  it("sums item lines plus delivery fee", () => {
    const total = groupTotalPaise(
      [
        { userId: "A", pricePaise: 4500, quantity: 1 },
        { userId: "B", pricePaise: 5500, quantity: 2 },
      ],
      2000,
    );
    expect(total).toBe(4500 + 5500 * 2 + 2000);
  });
});
