import { describe, it, expect } from "vitest";
import { generateUpiLink, isValidVpa } from "../../src/lib/upi.js";

describe("generateUpiLink", () => {
  it("builds a upi://pay link with the amount in rupees", () => {
    const link = generateUpiLink({
      payeeVpa: "coordinator@upi",
      payeeName: "Coordinator Name",
      amountPaise: 12345,
      note: "CampusCart group g1",
      txnRef: "g1-user2",
    });
    expect(link).toMatch(/^upi:\/\/pay\?/);
    const params = new URLSearchParams(link.split("?")[1]);
    expect(params.get("pa")).toBe("coordinator@upi");
    expect(params.get("am")).toBe("123.45");
    expect(params.get("cu")).toBe("INR");
    expect(params.get("tr")).toBe("g1-user2");
  });
});

describe("isValidVpa", () => {
  it("accepts a well-formed VPA", () => {
    expect(isValidVpa("student.name@okhdfcbank")).toBe(true);
  });

  it("rejects a string with no @handle", () => {
    expect(isValidVpa("not-a-vpa")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidVpa("")).toBe(false);
  });
});
