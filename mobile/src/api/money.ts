// Same convention as the backend: amounts travel as integer paise.
export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toFixed(2).replace(/\.00$/, "")}`;
}
