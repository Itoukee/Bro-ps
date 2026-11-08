import { colors, fontAssets, fontFamily } from '@/ui/theme';

describe('theme', () => {
  it('exposes the approved color palette', () => {
    expect(colors).toEqual({
      ink: '#2A1E5C',
      muted: '#5B5180',
      yellow: '#FFD84D',
      sky: '#BDE6FF',
      mint: '#DDF6E6',
      coral: '#FF5C72',
      purple: '#6A45F5',
      white: '#FFFFFF',
    });
  });

  it('uses Fredoka for headings and digits, and Nunito for body text', () => {
    expect(fontFamily.heading).toMatch(/^Fredoka_/);
    expect(fontFamily.digits).toMatch(/^Fredoka_/);
    expect(fontFamily.body).toMatch(/^Nunito_/);
  });

  it('has a font asset to load for every font family it names', () => {
    expect(Object.keys(fontAssets).sort()).toEqual([...new Set(Object.values(fontFamily))].sort());
  });
});
