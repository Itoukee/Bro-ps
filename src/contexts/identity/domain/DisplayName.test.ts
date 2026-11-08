import { parseDisplayName } from './DisplayName';

describe('parseDisplayName', () => {
  it('keeps a name and drops the spaces around it', () => {
    expect(parseDisplayName('  Ana B.  ')).toBe('Ana B.');
  });

  it.each(['', '    '])('refuses the blank name %j', (raw) => {
    expect(parseDisplayName(raw)).toBeNull();
  });

  it('accepts 40 characters, counting an emoji as one like the database does', () => {
    const name = '🏍'.repeat(40);

    expect(parseDisplayName(name)).toBe(name);
  });

  it('refuses 41 characters', () => {
    expect(parseDisplayName('a'.repeat(41))).toBeNull();
  });
});
