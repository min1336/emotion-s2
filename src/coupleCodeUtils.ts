export const COUPLE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function getRandomCodePart(length: number) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => COUPLE_CODE_CHARS[value % COUPLE_CODE_CHARS.length]).join("");
}

export function generateCoupleCode() {
  return `S2-${getRandomCodePart(4)}-${getRandomCodePart(2)}`;
}

export function generateCoupleSecret() {
  return `${getRandomCodePart(4)}-${getRandomCodePart(4)}-${getRandomCodePart(4)}`.toLowerCase();
}
