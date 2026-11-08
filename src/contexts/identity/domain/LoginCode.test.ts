import { parseLoginCode } from './LoginCode';

describe('parseLoginCode', () => {
  it('accepts six digits', () => {
    expect(parseLoginCode('012345')).toBe('012345');
  });

  it('ignores the spaces around a pasted code', () => {
    expect(parseLoginCode(' 012345 ')).toBe('012345');
  });

  it.each(['', '12345', '1234567', '12a456', '12 456'])('refuses %j', (raw) => {
    expect(parseLoginCode(raw)).toBeNull();
  });
});
