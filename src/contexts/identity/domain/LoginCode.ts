declare const brand: unique symbol;

export type LoginCode = string & { readonly [brand]: 'LoginCode' };

const SHAPE = /^\d{6}$/;

export function parseLoginCode(raw: string): LoginCode | null {
  const code = raw.trim();
  return SHAPE.test(code) ? (code as LoginCode) : null;
}
