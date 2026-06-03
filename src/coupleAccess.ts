export function normalizeCoupleCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function normalizeCoupleSecret(value: string) {
  return value.trim();
}
