declare const brand: unique symbol;

export type DisplayName = string & { readonly [brand]: 'DisplayName' };

const MAX_LENGTH = 40;

export function parseDisplayName(raw: string): DisplayName | null {
  const name = raw.trim();
  // Spread counts code points, as char_length does in the database check.
  const length = [...name].length;
  return length >= 1 && length <= MAX_LENGTH ? (name as DisplayName) : null;
}
