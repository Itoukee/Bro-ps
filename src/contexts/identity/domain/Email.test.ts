import { parseEmail } from './Email';

describe('parseEmail', () => {
  it('accepts a well formed address', () => {
    expect(parseEmail('ana@example.com')).toBe('ana@example.com');
  });

  it('ignores the spaces a keyboard or a paste leaves around it', () => {
    expect(parseEmail('  ana@example.com \n')).toBe('ana@example.com');
  });

  it.each(['', '   ', 'ana', 'ana@', '@example.com', 'ana@example', 'a na@example.com', 'a@b@c.com'])(
    'refuses %j',
    (raw) => {
      expect(parseEmail(raw)).toBeNull();
    },
  );

  it('refuses an address longer than 254 characters', () => {
    expect(parseEmail(`${'a'.repeat(243)}@example.com`)).toBeNull();
  });
});
