declare const brand: unique symbol;

export type Email = string & { readonly [brand]: 'Email' };

const MAX_LENGTH = 254;
const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(raw: string): Email | null {
  const email = raw.trim();
  return email.length <= MAX_LENGTH && SHAPE.test(email) ? (email as Email) : null;
}
