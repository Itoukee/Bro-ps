import {
  DEFAULT_DOT_APPEARANCE,
  DOT_BODY_COLORS,
  DOT_EXTRAS,
  DOT_HELMET_COLORS,
  parseDotAppearance,
  type DotAppearance,
} from './DotAppearance';

describe('the Dot palette', () => {
  it('offers the approved body colors', () => {
    expect(DOT_BODY_COLORS).toEqual(['#FFD84D', '#FFB23E', '#7ED957', '#FF8FC7']);
  });

  it('offers the approved helmet colors', () => {
    expect(DOT_HELMET_COLORS).toEqual(['#6A45F5', '#FF5C72', '#2F9BFF', '#7B5CFF', '#7ED957']);
  });

  it('offers the approved extras', () => {
    expect(DOT_EXTRAS).toEqual(['none', 'mohawk', 'ears', 'horns', 'stache']);
  });
});

describe('the default appearance', () => {
  it('is a valid appearance with no extra', () => {
    expect(parseDotAppearance(DEFAULT_DOT_APPEARANCE)).toEqual({
      bodyColor: '#FFD84D',
      helmetColor: '#6A45F5',
      extra: 'none',
    });
  });
});

describe('parsing a Dot appearance', () => {
  const valid = { bodyColor: '#FFB23E', helmetColor: '#2F9BFF', extra: 'horns' };

  it('accepts every combination of the palette', () => {
    for (const bodyColor of DOT_BODY_COLORS) {
      for (const helmetColor of DOT_HELMET_COLORS) {
        for (const extra of DOT_EXTRAS) {
          const appearance = { bodyColor, helmetColor, extra };
          expect(parseDotAppearance(appearance)).toEqual(appearance);
        }
      }
    }
  });

  it.each([
    ['a body color outside the palette', { ...valid, bodyColor: '#000000' }],
    ['a helmet color used as a body color', { ...valid, bodyColor: '#6A45F5' }],
    ['a body color used as a helmet color', { ...valid, helmetColor: '#FFD84D' }],
    ['a color in lower case', { ...valid, bodyColor: '#ffb23e' }],
    ['an unknown extra', { ...valid, extra: 'wings' }],
    ['an empty extra', { ...valid, extra: '' }],
  ])('refuses %s', (_name, candidate) => {
    expect(parseDotAppearance(candidate)).toBeNull();
  });

  it('keeps only the three fields of the appearance', () => {
    expect(parseDotAppearance({ ...valid, mood: 'worried' } as typeof valid)).toEqual(valid);
  });
});

describe('the DotAppearance type', () => {
  it('cannot be built from colors outside the palette', () => {
    // @ts-expect-error A color outside the palette does not compile.
    const invalid: DotAppearance = { bodyColor: '#000000', helmetColor: '#6A45F5', extra: 'none' };

    expect(parseDotAppearance(invalid)).toBeNull();
  });
});
