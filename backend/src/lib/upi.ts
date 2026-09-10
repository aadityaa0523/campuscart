export interface UpiLinkInput {
  payeeVpa: string;
  payeeName: string;
  amountPaise: number;
  note: string;
  txnRef: string;
}

/** Builds a `upi://pay` deep link. Money never touches CampusCart — this just
 * hands the OS a pre-filled intent; the bank apps move funds bank-to-bank. */
export function generateUpiLink(input: UpiLinkInput): string {
  const params = new URLSearchParams({
    pa: input.payeeVpa,
    pn: input.payeeName,
    am: (input.amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: input.note,
    tr: input.txnRef,
  });
  return `upi://pay?${params.toString()}`;
}

const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{2,64}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_RE.test(vpa);
}
