import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

import { colors } from '@/ui/theme';
import rawStyle from '@/ui/theme/friendlyMapStyle.json';
import { friendlyMapStyle } from '@/ui/theme/mapStyle';

const styleWith = (key: string) => {
  const style = friendlyMapStyle(key);
  if (style === null) {
    throw new Error('expected a style');
  }
  return style;
};

const paintOf = (id: string): Record<string, unknown> => {
  const layer = rawStyle.layers.find((candidate) => candidate.id === id);
  if (layer === undefined) {
    throw new Error(`no layer named ${id}`);
  }
  return layer.paint as Record<string, unknown>;
};

describe('friendlyMapStyle', () => {
  it('is a valid MapLibre style', () => {
    expect(validateStyleMin(styleWith('test-key'))).toEqual([]);
  });

  it('asks MapTiler for tiles and fonts with the given key, over HTTPS', () => {
    const style = styleWith('test-key');

    expect(style.sources.openmaptiles).toEqual({
      type: 'vector',
      url: 'https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=test-key',
    });
    expect(style.glyphs).toBe('https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=test-key');
  });

  it('escapes the key so it cannot change the address', () => {
    const style = styleWith('a&b=$1');

    expect(style.glyphs).toContain('?key=a%26b%3D%241');
  });

  it.each([[undefined], [''], ['   ']])('has no style without a key (%j)', (key) => {
    expect(friendlyMapStyle(key)).toBeNull();
  });

  it('keeps no key in the style stored in the repository', () => {
    expect(JSON.stringify(rawStyle)).not.toMatch(/key=(?!\{key\})/);
  });

  it('paints mint land, sky water and white roads with ink outlines from the theme', () => {
    expect(paintOf('land')['background-color']).toBe(colors.mint);
    expect(paintOf('water')['fill-color']).toBe(colors.sky);
    expect(paintOf('waterway')['line-color']).toBe(colors.sky);
    expect(paintOf('road')['line-color']).toBe(colors.white);
    expect(paintOf('road-outline')['line-color']).toBe(colors.ink);
  });

  it('writes place names in ink', () => {
    expect(paintOf('place-name')['text-color']).toBe(colors.ink);
  });

  it('draws the outline of a road underneath the road', () => {
    const ids = rawStyle.layers.map((layer) => layer.id);

    expect(ids.indexOf('road-outline')).toBeLessThan(ids.indexOf('road'));
  });
});
