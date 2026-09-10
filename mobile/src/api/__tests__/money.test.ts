import { formatPaise } from "../money";

describe("formatPaise", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatPaise(20000)).toBe("₹200");
  });

  it("keeps decimals when the amount isn't a whole rupee", () => {
    expect(formatPaise(12345)).toBe("₹123.45");
  });

  it("formats zero", () => {
    expect(formatPaise(0)).toBe("₹0");
  });
});
